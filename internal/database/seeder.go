package database

import (
	"BitComercio/internal/models"
	"BitComercio/internal/security"
	"log"

	"gorm.io/gorm"
)

func RunSeeder(db *gorm.DB) error {
	var count int64

	// Seed Perfil
	db.Model(&models.Perfil{}).Count(&count)
	if count == 0 {
		perfil := models.Perfil{
			NombrePerfil: "Administrador",
		}
		if err := db.Create(&perfil).Error; err != nil {
			return err
		}
		log.Println("✅ Perfil Administrador creado")
	}

	// Limpiar el usuario anterior si existía para forzar el genérico
	db.Exec("DELETE FROM usuarios WHERE correo_electronico = 'carlos.alejandro89@outlook.com'")

	// Seed Usuario genérico
	db.Model(&models.Usuario{}).Count(&count)
	if count == 0 {
		var perfil models.Perfil
		if err := db.First(&perfil).Error; err != nil {
			return err
		}

		hash, err := security.HashPassword("admin123")
		if err != nil {
			return err
		}

		usuario := models.Usuario{
			Nombre:            "Administrador del Sistema",
			CorreoElectronico: "admin@kommerze.com",
			Password:          hash,
			CorreoConfirmado:  true,
			PerfilID:          perfil.ID,
		}
		if err := db.Create(&usuario).Error; err != nil {
			return err
		}
		log.Println("✅ Usuario Administrador creado (admin@kommerze.com)")
	}

	return nil
}
