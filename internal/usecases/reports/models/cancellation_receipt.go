package models

import "time"

type CancellationReceipt struct {
	Fecha          time.Time
	Negocio        string
	RazonSocial    string
	Sucursal       string
	Telefono       string
	Correo         string
	RFCEmisor      string
	UUID           string
	EstatusUUID    string
	CertificadoSAT string
	DigestValue    string
	SignatureValue string
}
