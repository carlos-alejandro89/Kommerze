package models

const (
	EstatusConfirmadoGuid = "86968037-975a-43ce-880c-043003010101"
	EstatusCanceladoGuid  = "86968037-975a-43ce-880c-043003010103"
	EstatusCompletadoGuid = "cd810479-c2da-43b0-b58c-35e631da5bf5"
)

type Estatus struct {
	BaseModel

	Nombre string `gorm:"size:50;not null;uniqueIndex"`
}

func (Estatus) TableName() string {
	return "estatus"
}
