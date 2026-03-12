package models

import "time"

type Auditoria struct {
	ID        uint `gorm:"primaryKey;"`
	BaseModel
	EstatusID *uint
	CentroID  *uint
	Sincronizado bool
	Fecha     *time.Time
}

func (Auditoria) TableName() string {
	return "auditoria"
}