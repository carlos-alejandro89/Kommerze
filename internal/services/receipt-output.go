package services

import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"html"
	"mime"
	"net"
	"net/mail"
	"net/smtp"
	"strings"
	"time"

	reportmodels "BitComercio/internal/usecases/reports/models"
	"BitComercio/internal/usecases/reports/renders"
)

func PrintReceipt(r reportmodels.Receipt, cfg ReceiptConfig) error {
	if strings.TrimSpace(cfg.PrinterAddress) == "" {
		return fmt.Errorf("configura la dirección de la miniprinter (ej. 192.168.1.50:9100)")
	}
	conn, err := net.DialTimeout("tcp", cfg.PrinterAddress, 5*time.Second)
	if err != nil {
		return fmt.Errorf("no se pudo conectar a la miniprinter: %w", err)
	}
	defer conn.Close()
	_, err = conn.Write(renders.RenderReceiptEscPos(
		r,
		cfg.EffectivePrinterPaperWidthMM(),
		cfg.EffectivePrinterPaperCut(),
		cfg.EffectivePrinterOpenDrawer(),
	))
	return err
}

func EmailReceipt(r reportmodels.Receipt, recipient string, cfg ReceiptConfig) error {
	if cfg.SMTPHost == "" || cfg.SMTPPort == "" || cfg.SMTPUser == "" || cfg.SMTPPassword == "" {
		return fmt.Errorf("configura el servidor SMTP y sus credenciales")
	}
	recipient = strings.TrimSpace(recipient)
	if _, err := mail.ParseAddress(recipient); err != nil {
		return fmt.Errorf("correo del destinatario inválido: %w", err)
	}
	pdf, err := renders.RenderReceiptPDF(r)
	if err != nil {
		return fmt.Errorf("no se pudo generar el PDF: %w", err)
	}
	// El envelope sender debe ser la cuenta autenticada. Gmail rechaza con
	// frecuencia dominios/aliases que no pertenecen a la cuenta SMTP.
	envelopeFrom := cfg.SMTPUser
	mixedBoundary := "kommerze-mixed-boundary"
	alternativeBoundary := "kommerze-alternative-boundary"
	subject := "Recibo de compra " + r.Folio
	fileName := "recibo-" + r.Folio + ".pdf"
	var msg bytes.Buffer
	fmt.Fprintf(&msg, "From: %s\r\nTo: %s\r\nSubject: %s\r\n", formatEmailFrom(r.Negocio, envelopeFrom), recipient, mime.QEncoding.Encode("UTF-8", subject))
	if replyTo := strings.TrimSpace(cfg.SMTPFrom); replyTo != "" && !strings.EqualFold(replyTo, envelopeFrom) {
		fmt.Fprintf(&msg, "Reply-To: %s\r\n", replyTo)
	}
	fmt.Fprintf(&msg, "Date: %s\r\nMessage-ID: <%d.%s@kommerze.local>\r\n", time.Now().Format(time.RFC1123Z), time.Now().UnixNano(), strings.ReplaceAll(r.Folio, " ", ""))
	fmt.Fprintf(&msg, "MIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=%q\r\n\r\n", mixedBoundary)
	fmt.Fprintf(&msg, "--%s\r\nContent-Type: multipart/alternative; boundary=%q\r\n\r\n", mixedBoundary, alternativeBoundary)
	fmt.Fprintf(&msg, "--%s\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n", alternativeBoundary)
	fmt.Fprintf(&msg, "Gracias por su compra en %s.\r\nRecibo: %s\r\nTotal: $%.2f MXN\r\n\r\nEl comprobante PDF se encuentra adjunto.\r\n\r\n", r.Negocio, r.Folio, r.Total)
	fmt.Fprintf(&msg, "--%s\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n%s\r\n", alternativeBoundary, receiptEmailHTML(r))
	fmt.Fprintf(&msg, "--%s--\r\n\r\n", alternativeBoundary)
	fmt.Fprintf(&msg, "--%s\r\nContent-Type: application/pdf; name=%q\r\nContent-Disposition: attachment; filename=%q\r\nContent-Transfer-Encoding: base64\r\n\r\n", mixedBoundary, fileName, fileName)
	encoded := base64.StdEncoding.EncodeToString(pdf)
	for len(encoded) > 76 {
		msg.WriteString(encoded[:76] + "\r\n")
		encoded = encoded[76:]
	}
	msg.WriteString(encoded + "\r\n--" + mixedBoundary + "--\r\n")

	if err := sendSMTP(cfg, envelopeFrom, recipient, msg.Bytes()); err != nil {
		return fmt.Errorf("el servidor SMTP rechazó el envío: %w", err)
	}
	return nil
}

func formatEmailFrom(name, address string) string {
	return (&mail.Address{Name: strings.TrimSpace(name), Address: strings.TrimSpace(address)}).String()
}

func sendSMTP(cfg ReceiptConfig, from, recipient string, message []byte) error {
	addr := net.JoinHostPort(cfg.SMTPHost, cfg.SMTPPort)
	tlsConfig := &tls.Config{ServerName: cfg.SMTPHost, MinVersion: tls.VersionTLS12}
	var client *smtp.Client
	if cfg.SMTPPort == "465" {
		conn, err := tls.DialWithDialer(&net.Dialer{Timeout: 10 * time.Second}, "tcp", addr, tlsConfig)
		if err != nil {
			return fmt.Errorf("conexión TLS: %w", err)
		}
		client, err = smtp.NewClient(conn, cfg.SMTPHost)
		if err != nil {
			return fmt.Errorf("sesión SMTP: %w", err)
		}
	} else {
		conn, err := net.DialTimeout("tcp", addr, 10*time.Second)
		if err != nil {
			return fmt.Errorf("conexión SMTP: %w", err)
		}
		client, err = smtp.NewClient(conn, cfg.SMTPHost)
		if err != nil {
			return fmt.Errorf("sesión SMTP: %w", err)
		}
		if ok, _ := client.Extension("STARTTLS"); !ok {
			client.Close()
			return fmt.Errorf("el servidor no ofrece STARTTLS en el puerto %s", cfg.SMTPPort)
		}
		if err = client.StartTLS(tlsConfig); err != nil {
			client.Close()
			return fmt.Errorf("negociación STARTTLS: %w", err)
		}
	}
	defer client.Close()
	if err := client.Auth(smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPHost)); err != nil {
		return fmt.Errorf("autenticación: %w; en Gmail usa una contraseña de aplicación de 16 caracteres", err)
	}
	if err := client.Mail(from); err != nil {
		return fmt.Errorf("remitente %s: %w", from, err)
	}
	if err := client.Rcpt(recipient); err != nil {
		return fmt.Errorf("destinatario %s: %w", recipient, err)
	}
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("inicio del mensaje: %w", err)
	}
	if _, err = writer.Write(message); err != nil {
		return fmt.Errorf("escritura del mensaje: %w", err)
	}
	if err = writer.Close(); err != nil {
		return fmt.Errorf("entrega del mensaje: %w", err)
	}
	return client.Quit()
}

func receiptEmailHTML(r reportmodels.Receipt) string {
	business := html.EscapeString(r.Negocio)
	folio := html.EscapeString(r.Folio)
	branch := html.EscapeString(r.Sucursal)
	date := html.EscapeString(r.Fecha.Format("02/01/2006 15:04"))
	return fmt.Sprintf(`<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#172033">
<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 32px rgba(15,35,70,.10)">
<tr><td style="background:#002366;padding:30px 36px;text-align:center">
<div style="font-size:26px;line-height:1.2;font-weight:800;letter-spacing:1px;color:#ffffff">%s</div>
<div style="margin-top:7px;font-size:12px;letter-spacing:2px;color:#b9cdf8">COMPROBANTE DE COMPRA</div>
</td></tr>
<tr><td style="padding:34px 36px">
<div style="font-size:22px;font-weight:700;color:#172033">¡Gracias por tu compra!</div>
<p style="margin:10px 0 26px;font-size:15px;line-height:1.65;color:#647087">Tu operación se realizó correctamente. Adjuntamos el recibo en formato PDF para que puedas conservarlo.</p>
<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f7f9fc;border:1px solid #e5eaf2;border-radius:12px;padding:6px 18px">
<tr><td style="padding:14px 0;color:#718096;font-size:13px">Folio</td><td align="right" style="padding:14px 0;font-size:14px;font-weight:700">%s</td></tr>
<tr><td style="padding:14px 0;border-top:1px solid #e5eaf2;color:#718096;font-size:13px">Sucursal</td><td align="right" style="padding:14px 0;border-top:1px solid #e5eaf2;font-size:14px">%s</td></tr>
<tr><td style="padding:14px 0;border-top:1px solid #e5eaf2;color:#718096;font-size:13px">Fecha</td><td align="right" style="padding:14px 0;border-top:1px solid #e5eaf2;font-size:14px">%s</td></tr>
<tr><td style="padding:16px 0;border-top:1px solid #d9e1ed;color:#172033;font-size:15px;font-weight:700">Total</td><td align="right" style="padding:16px 0;border-top:1px solid #d9e1ed;color:#002366;font-size:22px;font-weight:800">$%.2f MXN</td></tr>
</table>
<div style="margin-top:25px;padding:16px 18px;border-left:4px solid #0bc33f;background:#f1fbf4;border-radius:8px;font-size:13px;line-height:1.55;color:#385344">Encontrarás el comprobante completo en el archivo PDF adjunto a este correo.</div>
</td></tr>
<tr><td style="padding:20px 36px;background:#f7f9fc;border-top:1px solid #e5eaf2;text-align:center;font-size:11px;line-height:1.6;color:#8a95a8">Este correo fue generado automáticamente por Kommerze POS. Por favor, conserva tu comprobante.</td></tr>
</table>
</td></tr></table></body></html>`, business, folio, branch, date, r.Total)
}
