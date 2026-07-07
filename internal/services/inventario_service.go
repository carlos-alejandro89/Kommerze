package services

import (
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode"
)

type InventarioService struct {
	repo *repository.InventarioRepository
}

func NewInventarioService(repo *repository.InventarioRepository) *InventarioService {
	return &InventarioService{repo: repo}
}

func (s *InventarioService) GuardarArchivoJSON(nombreArchivo string, contenido string) *dto.ResponseDto {
	contenido = strings.TrimSpace(contenido)
	if contenido == "" {
		return dto.NewResponseDto(false, "El archivo JSON esta vacio", nil, []string{"El contenido del archivo esta vacio"})
	}

	var payload any
	if err := json.Unmarshal([]byte(contenido), &payload); err != nil {
		return dto.NewResponseDto(false, "El archivo no contiene un JSON valido", nil, []string{err.Error()})
	}

	configDir, err := os.UserConfigDir()
	if err != nil {
		return dto.NewResponseDto(false, "No fue posible resolver la carpeta de configuracion", nil, []string{err.Error()})
	}

	saveDir := filepath.Join(configDir, "Kommerze", "inventario", "imports")
	if err := os.MkdirAll(saveDir, 0755); err != nil {
		return dto.NewResponseDto(false, "No fue posible crear la carpeta de inventario", nil, []string{err.Error()})
	}

	prettyJSON, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return dto.NewResponseDto(false, "No fue posible preparar el archivo JSON", nil, []string{err.Error()})
	}

	fileName := fmt.Sprintf("%s_%s.json", time.Now().Format("20060102_150405"), sanitizeJSONFileName(nombreArchivo))
	filePath := filepath.Join(saveDir, fileName)

	if err := os.WriteFile(filePath, prettyJSON, 0644); err != nil {
		return dto.NewResponseDto(false, "No fue posible guardar el archivo JSON", nil, []string{err.Error()})
	}

	importResult := dto.NewResponseDto(false, "Importacion no disponible", nil, []string{"Repositorio de inventario no disponible"})
	if s.repo != nil {
		importResult = s.repo.ImportarInventario(string(prettyJSON))
	}

	if !importResult.Success {
		return dto.NewResponseDto(
			false,
			"Archivo JSON guardado, pero no fue posible importar el inventario",
			map[string]any{
				"fileName": fileName,
				"path":     filePath,
				"import":   importResult.Data,
			},
			importResult.Errors,
		)
	}

	return dto.NewResponseDto(
		true,
		"Archivo JSON guardado e inventario importado correctamente",
		map[string]any{
			"fileName":  fileName,
			"path":      filePath,
			"sizeBytes": len(prettyJSON),
			"import":    importResult.Data,
		},
		importResult.Errors,
	)
}

func sanitizeJSONFileName(nombreArchivo string) string {
	base := filepath.Base(strings.TrimSpace(nombreArchivo))
	base = strings.TrimSuffix(base, filepath.Ext(base))
	if base == "" || base == "." {
		return "inventario"
	}

	var builder strings.Builder
	for _, r := range base {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-' || r == '_' {
			builder.WriteRune(r)
			continue
		}
		builder.WriteRune('_')
	}

	safeName := strings.Trim(builder.String(), "_")
	if safeName == "" {
		return "inventario"
	}
	return safeName
}
