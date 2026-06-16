package database

import (
	"BitComercio/internal/services"
	"embed"
	"log"
	"net/url"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"gorm.io/gorm"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func RunMigrationsV2(db *gorm.DB, cfg *services.KommerzConfig) error {
	host, port, user, pass, name, ssl, _ := cfg.EffectiveDBConfig()

	d, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		log.Fatal(err)
	}

	m, err := migrate.NewWithSourceInstance(
		"iofs",
		d,
		"postgres://"+url.QueryEscape(user)+":"+url.QueryEscape(pass)+"@"+host+":"+port+"/"+name+"?sslmode="+ssl,
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
