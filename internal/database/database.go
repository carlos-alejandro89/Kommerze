package database

import (
	"BitComercio/internal/services"
	"fmt"
	"net/url"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func buildDSN(cfg *services.KommerzConfig) string {
	host, port, user, pass, name, ssl, timeZone := cfg.EffectiveDBConfig()

	// Formato clásico key=value (más seguro que URL si hay caracteres especiales)
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=%s",
		host,
		port,
		url.QueryEscape(user),
		url.QueryEscape(pass),
		name,
		ssl,
		timeZone,
	)
}

// NewDB abre una conexión a PostgreSQL usando los valores de KommerzConfig.
// Si los campos de BD están vacíos se aplican los defaults de instalación estándar.
func NewDB(cfg *services.KommerzConfig) (*gorm.DB, error) {
	dsn := buildDSN(cfg)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("error al conectar a la base de datos: %w", err)
	}
	return db, nil
}

// TestDBConnection abre y cierra una conexión de prueba.
// Devuelve nil si la conexión es exitosa; de lo contrario devuelve el error.
func TestDBConnection(cfg *services.KommerzConfig) error {
	db, err := NewDB(cfg)
	if err != nil {
		return err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	defer sqlDB.Close()
	return sqlDB.Ping()
}
