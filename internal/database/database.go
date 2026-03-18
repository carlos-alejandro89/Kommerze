package database

import (
	"fmt"
	"net/url"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func buildDSN() (string, error) {
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := url.QueryEscape(os.Getenv("DB_USER"))
	pass := url.QueryEscape(os.Getenv("DB_PASSWORD"))
	name := os.Getenv("DB_NAME")
	ssl := os.Getenv("SSL_MODE")

	if host == "" || port == "" || user == "" || name == "" {
		return "", fmt.Errorf("faltan variables de entorno para la conexión a la base de datos")
	}

	if ssl == "" {
		ssl = "disable"
	}

	// Formato clásico key=value (más seguro que URL si hay caracteres especiales)
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host,
		port,
		user,
		pass,
		name,
		ssl,
	)

	return dsn, nil
}

func NewDB() (*gorm.DB, error) {
	dsn, err := buildDSN()

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("Error al conectar a la base de datos")
	}

	return db, nil

}
