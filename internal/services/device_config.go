package services

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// DeviceRole identifica el rol que cumple este dispositivo en la red.
type DeviceRole string

const (
	RoleUnset       DeviceRole = ""
	RoleLocalServer DeviceRole = "servidor_local"
	RoleCaja        DeviceRole = "caja"
)

// CloudCredentials es exportado para mantener compatibilidad con código existente.
type CloudCredentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}


// KommerzConfig es el único archivo de configuración del dispositivo.
// Se persiste en ~/.config/Kommerze/kommerze_config.json
// y reemplaza los archivos separados: licencia.json, cloud_credentials.json.
type KommerzConfig struct {
	// Rol del dispositivo en la red
	Role DeviceRole `json:"role"`

	// Solo para Role = RoleCaja: URL base del Servidor Local (ej. http://192.168.1.10:8989)
	LocalServerURL string `json:"localServerUrl,omitempty"`

	// Credenciales de sincronización con la nube (solo Servidor Local)
	CloudEmail    string `json:"cloudEmail,omitempty"`
	CloudPassword string `json:"cloudPassword,omitempty"`

	// Licencia de la sucursal (solo Servidor Local, escrita al activar)
	License *LicenseData `json:"license,omitempty"`
}

// GetKommerzConfigPath devuelve la ruta completa al archivo de configuración.
func GetKommerzConfigPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	appDir := filepath.Join(configDir, "Kommerze")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return "", err
	}
	return filepath.Join(appDir, "kommerze_config.json"), nil
}

// LoadKommerzConfig lee la configuración del dispositivo desde disco.
// Si el archivo no existe, devuelve una configuración vacía (sin error).
func LoadKommerzConfig() (*KommerzConfig, error) {
	path, err := GetKommerzConfigPath()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return &KommerzConfig{}, nil
	}
	if err != nil {
		return nil, err
	}

	var cfg KommerzConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

// SaveKommerzConfig persiste la configuración del dispositivo en disco.
func SaveKommerzConfig(cfg *KommerzConfig) error {
	path, err := GetKommerzConfigPath()
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

// SaveCloudCredentials actualiza las credenciales de nube en el config unificado.
// Mantiene compatibilidad con el código existente que llama esta función.
func SaveCloudCredentials(email, password string) error {
	cfg, err := LoadKommerzConfig()
	if err != nil {
		return err
	}
	cfg.CloudEmail = email
	cfg.CloudPassword = password
	return SaveKommerzConfig(cfg)
}

// LoadCloudCredentials lee las credenciales de nube del config unificado.
// Mantiene compatibilidad con el código existente.
func LoadCloudCredentials() (*CloudCredentials, error) {
	cfg, err := LoadKommerzConfig()
	if err != nil {
		return nil, err
	}
	if cfg.CloudEmail == "" {
		return nil, os.ErrNotExist
	}
	return &CloudCredentials{
		Email:    cfg.CloudEmail,
		Password: cfg.CloudPassword,
	}, nil
}
