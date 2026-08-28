package services

import (
	"BitComercio/internal/models"
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"html"
	"mime"
	"net"
	"net/mail"
	"net/smtp"
	"os"
	"path/filepath"
	"strings"
	"time"

	reportmodels "BitComercio/internal/usecases/reports/models"
	"BitComercio/internal/usecases/reports/renders"
)

func EmailInvoiceFiles(invoice models.Factura, orderFolio int, recipients []string, cfg ReceiptConfig) error {
	if cfg.SMTPHost == "" || cfg.SMTPPort == "" || cfg.SMTPUser == "" || cfg.SMTPPassword == "" {
		return fmt.Errorf("configura el servidor SMTP y sus credenciales")
	}
	unique := make([]string, 0, len(recipients))
	seen := map[string]bool{}
	for _, value := range recipients {
		address := strings.TrimSpace(value)
		if address == "" {
			continue
		}
		parsed, err := mail.ParseAddress(address)
		if err != nil {
			return fmt.Errorf("correo del destinatario inválido %q: %w", address, err)
		}
		normalized := strings.ToLower(parsed.Address)
		if !seen[normalized] {
			seen[normalized] = true
			unique = append(unique, parsed.Address)
		}
	}
	if len(unique) == 0 {
		return fmt.Errorf("agrega al menos un destinatario")
	}
	pdf, err := os.ReadFile(invoice.ArchivoPDF)
	if err != nil {
		return fmt.Errorf("no se pudo leer el PDF fiscal: %w", err)
	}
	xml, err := os.ReadFile(invoice.ArchivoXML)
	if err != nil {
		return fmt.Errorf("no se pudo leer el XML fiscal: %w", err)
	}
	envelopeFrom := cfg.SMTPUser
	mixedBoundary := "kommerze-cfdi-mixed"
	alternativeBoundary := "kommerze-cfdi-alternative"
	subject := "Factura CFDI " + invoice.UUID
	var msg bytes.Buffer
	fmt.Fprintf(&msg, "From: %s\r\nTo: %s\r\nSubject: %s\r\n", formatEmailFrom("Kommerze", envelopeFrom), strings.Join(unique, ", "), mime.QEncoding.Encode("UTF-8", subject))
	if replyTo := strings.TrimSpace(cfg.SMTPFrom); replyTo != "" && !strings.EqualFold(replyTo, envelopeFrom) {
		fmt.Fprintf(&msg, "Reply-To: %s\r\n", replyTo)
	}
	fmt.Fprintf(&msg, "Date: %s\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=%q\r\n\r\n", time.Now().Format(time.RFC1123Z), mixedBoundary)
	fmt.Fprintf(&msg, "--%s\r\nContent-Type: multipart/alternative; boundary=%q\r\n\r\n", mixedBoundary, alternativeBoundary)
	fmt.Fprintf(&msg, "--%s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nAdjuntamos el PDF y XML de su factura con folio fiscal %s.\r\n", alternativeBoundary, invoice.UUID)
	fmt.Fprintf(&msg, "--%s\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n%s\r\n--%s--\r\n\r\n", alternativeBoundary, invoiceEmailHTML(invoice, orderFolio), alternativeBoundary)
	writeEmailAttachment(&msg, mixedBoundary, filepath.Base(invoice.ArchivoPDF), "application/pdf", pdf)
	writeEmailAttachment(&msg, mixedBoundary, filepath.Base(invoice.ArchivoXML), "application/xml", xml)
	fmt.Fprintf(&msg, "--%s--\r\n", mixedBoundary)
	if err := sendSMTPMany(cfg, envelopeFrom, unique, msg.Bytes()); err != nil {
		return fmt.Errorf("el servidor SMTP rechazó el envío: %w", err)
	}
	return nil
}

func writeEmailAttachment(msg *bytes.Buffer, boundary, fileName, contentType string, data []byte) {
	fmt.Fprintf(msg, "--%s\r\nContent-Type: %s; name=%q\r\nContent-Disposition: attachment; filename=%q\r\nContent-Transfer-Encoding: base64\r\n\r\n", boundary, contentType, fileName, fileName)
	encoded := base64.StdEncoding.EncodeToString(data)
	for len(encoded) > 76 {
		msg.WriteString(encoded[:76] + "\r\n")
		encoded = encoded[76:]
	}
	msg.WriteString(encoded + "\r\n")
}

func invoiceEmailHTML(invoice models.Factura, orderFolio int) string {
	return fmt.Sprintf(`<!doctype html><html lang="es"><body style="margin:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#172033"><table width="100%%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center"><table width="100%%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 32px rgba(15,35,70,.10)"><tr><td style="background:#002366;padding:30px 36px;color:#fff"><div style="font-size:25px;font-weight:800">Factura timbrada</div><div style="margin-top:7px;color:#b9cdf8;letter-spacing:2px">KOMMERZE</div></td></tr><tr><td style="padding:34px 36px"><div style="font-size:21px;font-weight:700">Su comprobante fiscal está listo</div><p style="color:#647087;line-height:1.65">Adjuntamos las representaciones PDF y XML correspondientes a su CFDI.</p><table width="100%%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #e5eaf2;border-radius:12px;padding:8px 18px"><tr><td style="padding:13px 0;color:#718096">Pedido</td><td align="right" style="font-weight:700">%06d</td></tr><tr><td style="padding:13px 0;border-top:1px solid #e5eaf2;color:#718096">Folio fiscal</td><td align="right" style="border-top:1px solid #e5eaf2;font-size:12px">%s</td></tr><tr><td style="padding:15px 0;border-top:1px solid #e5eaf2;font-weight:700">Total</td><td align="right" style="padding:15px 0;border-top:1px solid #e5eaf2;color:#002366;font-size:20px;font-weight:800">%s MXN</td></tr></table><p style="margin-top:24px;color:#647087;font-size:13px">Conserve ambos archivos para sus registros fiscales.</p></td></tr><tr><td style="padding:18px;background:#f7f9fc;text-align:center;color:#8a95a8;font-size:11px">Documento enviado por Kommerze POS.</td></tr></table></td></tr></table></body></html>`, orderFolio, html.EscapeString(invoice.UUID), formatMoney(invoice.Total.InexactFloat64()))
}

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
	fmt.Fprintf(&msg, "Gracias por su compra en %s.\r\nRecibo: %s\r\nTotal: %s MXN\r\n\r\nEl comprobante PDF se encuentra adjunto.\r\n\r\n", r.Negocio, r.Folio, formatMoney(r.Total))
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

func EmailQuotation(q reportmodels.Quotation, recipient string, cfg ReceiptConfig) error {
	if cfg.SMTPHost == "" || cfg.SMTPPort == "" || cfg.SMTPUser == "" || cfg.SMTPPassword == "" {
		return fmt.Errorf("configura el servidor SMTP y sus credenciales")
	}
	recipient = strings.TrimSpace(recipient)
	if _, err := mail.ParseAddress(recipient); err != nil {
		return fmt.Errorf("correo del destinatario inválido: %w", err)
	}
	pdf, err := renders.RenderQuotationPDF(q)
	if err != nil {
		return fmt.Errorf("no se pudo generar el PDF: %w", err)
	}
	envelopeFrom := cfg.SMTPUser
	mixedBoundary, alternativeBoundary := "kommerze-quotation-mixed", "kommerze-quotation-alternative"
	subject, fileName := "Cotización "+q.Folio, "cotizacion-"+q.Folio+".pdf"
	var msg bytes.Buffer
	fmt.Fprintf(&msg, "From: %s\r\nTo: %s\r\nSubject: %s\r\n", formatEmailFrom(q.Negocio, envelopeFrom), recipient, mime.QEncoding.Encode("UTF-8", subject))
	if replyTo := strings.TrimSpace(cfg.SMTPFrom); replyTo != "" && !strings.EqualFold(replyTo, envelopeFrom) {
		fmt.Fprintf(&msg, "Reply-To: %s\r\n", replyTo)
	}
	fmt.Fprintf(&msg, "Date: %s\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=%q\r\n\r\n", time.Now().Format(time.RFC1123Z), mixedBoundary)
	fmt.Fprintf(&msg, "--%s\r\nContent-Type: multipart/alternative; boundary=%q\r\n\r\n", mixedBoundary, alternativeBoundary)
	fmt.Fprintf(&msg, "--%s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nAdjuntamos la cotización %s por un total de %s MXN.\r\n", alternativeBoundary, q.Folio, formatMoney(q.Total))
	fmt.Fprintf(&msg, "--%s\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n%s\r\n--%s--\r\n\r\n", alternativeBoundary, quotationEmailHTML(q), alternativeBoundary)
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

func quotationEmailHTML(q reportmodels.Quotation) string {
	return fmt.Sprintf(`<!doctype html><html lang="es"><body style="margin:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#172033"><table width="100%%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center"><table width="100%%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 32px rgba(15,35,70,.10)"><tr><td style="background:#002366;padding:30px 36px;color:#fff"><div style="font-size:25px;font-weight:800">%s</div><div style="margin-top:7px;color:#b9cdf8;letter-spacing:2px">COTIZACIÓN</div></td></tr><tr><td style="padding:34px 36px"><div style="font-size:22px;font-weight:700">Preparamos tu cotización</div><p style="color:#647087;line-height:1.65">Hola %s, adjuntamos el documento PDF con el detalle de productos y precios solicitados.</p><table width="100%%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #e5eaf2;border-radius:12px;padding:8px 18px"><tr><td style="padding:13px 0;color:#718096">Folio</td><td align="right" style="font-weight:700">%s</td></tr><tr><td style="padding:13px 0;border-top:1px solid #e5eaf2;color:#718096">Vigencia</td><td align="right" style="border-top:1px solid #e5eaf2">%d días</td></tr><tr><td style="padding:15px 0;border-top:1px solid #e5eaf2;font-weight:700">Total</td><td align="right" style="padding:15px 0;border-top:1px solid #e5eaf2;color:#002366;font-size:21px;font-weight:800">%s MXN</td></tr></table><p style="margin-top:24px;color:#647087;font-size:13px">Quedamos atentos para ayudarte con cualquier duda sobre esta propuesta.</p></td></tr><tr><td style="padding:18px;background:#f7f9fc;text-align:center;color:#8a95a8;font-size:11px">Documento generado por Kommerze POS.</td></tr></table></td></tr></table></body></html>`, html.EscapeString(q.Negocio), html.EscapeString(q.Cliente), html.EscapeString(q.Folio), q.VigenciaDias, formatMoney(q.Total))
}

func formatEmailFrom(name, address string) string {
	return (&mail.Address{Name: strings.TrimSpace(name), Address: strings.TrimSpace(address)}).String()
}

func sendSMTP(cfg ReceiptConfig, from, recipient string, message []byte) error {
	return sendSMTPMany(cfg, from, []string{recipient}, message)
}

func sendSMTPMany(cfg ReceiptConfig, from string, recipients []string, message []byte) error {
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
	for _, recipient := range recipients {
		if err := client.Rcpt(recipient); err != nil {
			return fmt.Errorf("destinatario %s: %w", recipient, err)
		}
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
<tr><td style="padding:16px 0;border-top:1px solid #d9e1ed;color:#172033;font-size:15px;font-weight:700">Total</td><td align="right" style="padding:16px 0;border-top:1px solid #d9e1ed;color:#002366;font-size:22px;font-weight:800">%s MXN</td></tr>
</table>
<div style="margin-top:25px;padding:16px 18px;border-left:4px solid #0bc33f;background:#f1fbf4;border-radius:8px;font-size:13px;line-height:1.55;color:#385344">Encontrarás el comprobante completo en el archivo PDF adjunto a este correo.</div>
</td></tr>
<tr><td style="padding:20px 36px;background:#f7f9fc;border-top:1px solid #e5eaf2;text-align:center;font-size:11px;line-height:1.6;color:#8a95a8">Este correo fue generado automáticamente por Kommerze POS. Por favor, conserva tu comprobante.</td></tr>
</table>
</td></tr></table></body></html>`, business, folio, branch, date, formatMoney(r.Total))
}

func formatMoney(value float64) string {
	parts := strings.Split(fmt.Sprintf("%.2f", value), ".")
	integer := parts[0]
	sign := ""
	if strings.HasPrefix(integer, "-") {
		sign = "-"
		integer = strings.TrimPrefix(integer, "-")
	}
	for i := len(integer) - 3; i > 0; i -= 3 {
		integer = integer[:i] + "," + integer[i:]
	}
	return sign + "$" + integer + "." + parts[1]
}
