package database

import (
	"embed"
	"log"
	"net/url"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"gorm.io/gorm"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func RunMigrationsV2(db *gorm.DB) error {
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := url.QueryEscape(os.Getenv("DB_USER"))
	pass := url.QueryEscape(os.Getenv("DB_PASSWORD"))
	name := os.Getenv("DB_NAME")
	ssl := os.Getenv("SSL_MODE")

	d, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		log.Fatal(err)
	}

	m, err := migrate.NewWithSourceInstance(
		"iofs",
		d,
		"postgres://"+user+":"+pass+"@"+host+":"+port+"/"+name+"?sslmode="+ssl,
	)
	if err != nil {
		log.Fatal(err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatal(err)
	}
	log.Println("✅ Migrations V2 ejecutadas correctamente (iofs)")
	return nil
}
