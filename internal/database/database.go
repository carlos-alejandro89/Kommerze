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
	ssl  := os.Getenv("SSL_MODE")

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
	/*if err != nil {
		return nil, fmt.Errorf("error construyendo DSN: %w", err)
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("error abriendo conexión: %w", err)
	}

	// Verificamos conexión real
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("error conectando a la base de datos: %w", err)
	}

	return db, nil*/
	//dsn := buildDSN()
  
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
	  panic("Error al conectar a la base de datos")
	}
  
	

	return db, nil

}
