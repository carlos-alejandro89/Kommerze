package main

import (
	"BitComercio/internal/database"
	"BitComercio/internal/services"
	"embed"
	"log"

	"github.com/joho/godotenv"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Cargar .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Leer configuración del dispositivo
	cfg, err := services.LoadKommerzConfig()
	if err != nil {
		log.Printf("[main] Error leyendo config del dispositivo: %v — iniciando con config vacía", err)
		cfg = &services.KommerzConfig{}
	}
	log.Printf("[main] Rol del dispositivo: '%s'", cfg.Role)

	var app *App

	switch cfg.Role {
	case services.RoleLocalServer:
		// ── Servidor Local: conectar a BD y levantar todos los servicios ──────
		db, err := database.NewDB()
		if err != nil {
			log.Fatal("[main] Error conectando a la BD:", err)
		}
		if err = database.RunMigrations(db); err != nil {
			log.Fatal("[main] Error en migraciones:", err)
		}
		if err = database.RunSeeder(db); err != nil {
			log.Fatal("[main] Error en seeder:", err)
		}
		svc := services.NewServices(db, nil, cfg)
		app = NewApp(db, svc)

	case services.RoleCaja:
		// ── Caja: sin BD local, solo proxy HTTP hacia el Servidor Local ───────
		svc := services.NewServices(nil, nil, cfg)
		app = NewApp(nil, svc)

	default:
		// ── Sin rol configurado: iniciar sin servicios ─────────────────────────
		// El frontend detectará que no hay rol y redirigirá a /device-setup/role
		log.Println("[main] Dispositivo sin rol configurado — esperando selección en UI")
		svc := &services.Services{}
		app = NewApp(nil, svc)
	}

	// Correr Wails
	err = wails.Run(&options.App{
		Title:         "Kommerze",
		Width:         1532,
		Height:        768,
		DisableResize: false,
		Fullscreen:    true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		log.Fatal(err)
	}
}
