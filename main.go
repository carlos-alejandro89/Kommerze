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

	// 1️⃣ Crear conexion
	db, err := database.NewDB()
	if err != nil {
		log.Fatal(err)
	}

	err = database.RunMigrations(db)
	if err != nil {
		log.Fatal(err)
	}

	// Ejecutar Seeder para datos iniciales
	err = database.RunSeeder(db)
	if err != nil {
		log.Fatal(err)
	}

	// Iniciar servicios
	svc := services.NewServices(db, nil)

	// 3️⃣ Crear app inyectando dependencias
	app := NewApp(db, svc)

	// 4️⃣ Correr Wails
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
