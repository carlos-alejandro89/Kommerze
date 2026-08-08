package models

type RolesFiscales struct {
	BaseModel

	Nombre string `gorm:"size:200;not null"`
}

func (RolesFiscales) TableName() string {
	return "roles_fiscales"
}
