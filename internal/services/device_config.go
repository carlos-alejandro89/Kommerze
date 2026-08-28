package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

const DefaultCloudAPIURL = "https://kommerze-cloud-api.developers-lab.com"

const encryptedSecretPrefix = "enc:v1:"

// defaultStr devuelve fallback si s está vacío.
func defaultStr(s, fallback string) string {
	if s == "" {
		return fallback
	}
	return s
}

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

type NetPayCredentials struct {
	NetPayUser         string `json:"netPayUser"`
	NetPayPassword     string `json:"netPayPassword"`
	NetPayStoreId      string `json:"netPayStoreId"`
	NetPayDeviceSerial string `json:"netPayDeviceSerial"`
}

type ReceiptLegendGroup struct {
	Text string `json:"text"`
	Bold bool   `json:"bold"`
}

type ReceiptConfig struct {
	BusinessName        string               `json:"businessName,omitempty"`
	ShowLogo            bool                 `json:"showLogo,omitempty"`
	ShowBranchName      *bool                `json:"showBranchName,omitempty"`
	ShowBranchAddress   bool                 `json:"showBranchAddress,omitempty"`
	ShowBranchPhone     bool                 `json:"showBranchPhone,omitempty"`
	ShowBranchEmail     bool                 `json:"showBranchEmail,omitempty"`
	LegendGroups        []ReceiptLegendGroup `json:"legendGroups,omitempty"`
	Legends             []string             `json:"legends,omitempty"` // Compatibilidad con configuraciones anteriores.
	PrinterAddress      string               `json:"printerAddress,omitempty"`
	PrinterPaperWidthMM int                  `json:"printerPaperWidthMm,omitempty"`
	PrinterPaperCut     *bool                `json:"printerPaperCut,omitempty"`
	PrinterOpenDrawer   *bool                `json:"printerOpenDrawer,omitempty"`
	SMTPHost            string               `json:"smtpHost,omitempty"`
	SMTPPort            string               `json:"smtpPort,omitempty"`
	SMTPUser            string               `json:"smtpUser,omitempty"`
	SMTPPassword        string               `json:"smtpPassword,omitempty"`
	SMTPFrom            string               `json:"smtpFrom,omitempty"`
}

// EffectivePrinterPaperWidthMM conserva compatibilidad con configuraciones
// anteriores y limita el formato a los anchos térmicos soportados.
func (c ReceiptConfig) EffectivePrinterPaperWidthMM() int {
	if c.PrinterPaperWidthMM == 58 {
		return 58
	}
	return 80
}

func (c ReceiptConfig) EffectivePrinterPaperCut() bool {
	return c.PrinterPaperCut == nil || *c.PrinterPaperCut
}

func (c ReceiptConfig) EffectivePrinterOpenDrawer() bool {
	return c.PrinterOpenDrawer != nil && *c.PrinterOpenDrawer
}

func (c ReceiptConfig) EffectiveShowBranchName() bool {
	return c.ShowBranchName == nil || *c.ShowBranchName
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
	CloudAPIURL   string `json:"cloudApiUrl,omitempty"`

	// Servicio externo de facturación. Client ID y Client Secret se cifran
	// antes de escribir el archivo de configuración y se descifran al cargarlo.
	FacturacionAPIHost      string `json:"facturacionApiHost,omitempty"`
	FacturacionClientID     string `json:"facturacionClientId,omitempty"`
	FacturacionClientSecret string `json:"facturacionClientSecret,omitempty"`
	FacturacionXMLPath      string `json:"facturacionXmlPath,omitempty"`

	// Credenciales de NetPay
	NetPayUser         string `json:"netPayUser,omitempty"`
	NetPayPassword     string `json:"netPayPassword,omitempty"`
	NetPayStoreId      string `json:"netPayStoreId,omitempty"`
	NetPayDeviceSerial string `json:"netPayDeviceSerial,omitempty"`

	// Licencia de la sucursal (solo Servidor Local, escrita al activar)
	License *LicenseData `json:"license,omitempty"`

	// Configuración de la base de datos local (solo servidor_local).
	// Si están vacíos se usan los defaults de instalación estándar de PostgreSQL.
	DBHost     string `json:"dbHost,omitempty"`
	DBPort     string `json:"dbPort,omitempty"`
	DBUser     string `json:"dbUser,omitempty"`
	DBPassword string `json:"dbPassword,omitempty"`
	DBName     string `json:"dbName,omitempty"`
	DBSSLMode  string `json:"dbSslMode,omitempty"`

	// Zona horaria para el servidor Go y la conexión PostgreSQL
	TimeZone string `json:"timeZone,omitempty"`

	// Ticket térmico, impresora de red y correo SMTP (configuración local).
	Receipt ReceiptConfig `json:"receipt,omitempty"`
}

// EffectiveCloudAPIURL conserva compatibilidad con instalaciones que todavía
// no tienen cloudApiUrl en su archivo de configuración.
func (c *KommerzConfig) EffectiveCloudAPIURL() string {
	return strings.TrimRight(defaultStr(strings.TrimSpace(c.CloudAPIURL), DefaultCloudAPIURL), "/")
}

func ValidateCloudAPIURL(value string) error {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(value))
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return fmt.Errorf("la URL del API debe ser una dirección HTTP o HTTPS válida")
	}
	return nil
}

// EffectiveDBConfig devuelve los valores de conexión a la BD aplicando
// defaults para una instalación estándar de PostgreSQL cuando los campos
// del config están vacíos.
func (c *KommerzConfig) EffectiveDBConfig() (host, port, user, password, name, sslMode, timeZone string) {
	host = defaultStr(c.DBHost, "127.0.0.1")
	port = defaultStr(c.DBPort, "5432")
	user = defaultStr(c.DBUser, "postgres")
	password = c.DBPassword // sin default, PostgreSQL local suele no tener contraseña
	name = defaultStr(c.DBName, "kommerze_db")
	sslMode = defaultStr(c.DBSSLMode, "disable")
	timeZone = defaultStr(c.TimeZone, "America/Mexico_City")
	return
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

func getCredentialsKeyPath() (string, error) {
	configPath, err := GetKommerzConfigPath()
	if err != nil {
		return "", err
	}
	return filepath.Join(filepath.Dir(configPath), ".credentials.key"), nil
}

func loadCredentialsKey() ([]byte, error) {
	path, err := getCredentialsKeyPath()
	if err != nil {
		return nil, err
	}
	key, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	if len(key) != 32 {
		return nil, fmt.Errorf("la clave local de credenciales no es válida")
	}
	return key, nil
}

func loadOrCreateCredentialsKey() ([]byte, error) {
	path, err := getCredentialsKeyPath()
	if err != nil {
		return nil, err
	}
	if key, readErr := loadCredentialsKey(); readErr == nil {
		return key, nil
	} else if !os.IsNotExist(readErr) {
		return nil, readErr
	}

	key := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return nil, err
	}
	file, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if os.IsExist(err) {
		return loadOrCreateCredentialsKey()
	}
	if err != nil {
		return nil, err
	}
	if _, err = file.Write(key); err != nil {
		file.Close()
		return nil, err
	}
	if err = file.Close(); err != nil {
		return nil, err
	}
	return key, nil
}

func encryptConfigSecret(value, field string, key []byte) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" || strings.HasPrefix(value, encryptedSecretPrefix) {
		return value, nil
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	sealed := gcm.Seal(nonce, nonce, []byte(value), []byte(field))
	return encryptedSecretPrefix + base64.RawStdEncoding.EncodeToString(sealed), nil
}

func decryptConfigSecret(value, field string, key []byte) (string, error) {
	if value == "" || !strings.HasPrefix(value, encryptedSecretPrefix) {
		return value, nil // Compatibilidad con configuraciones previas en texto plano.
	}
	payload, err := base64.RawStdEncoding.DecodeString(strings.TrimPrefix(value, encryptedSecretPrefix))
	if err != nil {
		return "", fmt.Errorf("credencial de facturación inválida: %w", err)
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(payload) < gcm.NonceSize() {
		return "", fmt.Errorf("credencial de facturación incompleta")
	}
	plain, err := gcm.Open(nil, payload[:gcm.NonceSize()], payload[gcm.NonceSize():], []byte(field))
	if err != nil {
		return "", fmt.Errorf("no se pudo descifrar %s: %w", field, err)
	}
	return string(plain), nil
}

func getReceiptLogoPath() (string, error) {
	configPath, err := GetKommerzConfigPath()
	if err != nil {
		return "", err
	}
	return filepath.Join(filepath.Dir(configPath), "ticket_logo.base64"), nil
}

// SaveReceiptLogo persiste la imagen fuera del JSON principal para mantener
// pequeño y legible kommerze_config.json.
func SaveReceiptLogo(value string) error {
	value = strings.TrimSpace(value)
	if value == "" {
		return DeleteReceiptLogo()
	}
	if len(value) > 3*1024*1024 {
		return fmt.Errorf("el logotipo excede el tamaño permitido")
	}
	path, err := getReceiptLogoPath()
	if err != nil {
		return err
	}
	return os.WriteFile(path, []byte(value), 0600)
}

func LoadReceiptLogo() (string, error) {
	path, err := getReceiptLogoPath()
	if err != nil {
		return "", err
	}
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(data)), nil
}

func DeleteReceiptLogo() error {
	path, err := getReceiptLogoPath()
	if err != nil {
		return err
	}
	err = os.Remove(path)
	if os.IsNotExist(err) {
		return nil
	}
	return err
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
	// Compatibilidad con la primera versión del tab que utilizó el prefijo
	// inglés "billing". Se migra al contrato en español al finalizar la carga.
	var legacyFacturacion struct {
		APIHost      string `json:"billingApiHost"`
		ClientID     string `json:"billingClientId"`
		ClientSecret string `json:"billingClientSecret"`
	}
	_ = json.Unmarshal(data, &legacyFacturacion)
	legacyAPIHost := cfg.FacturacionAPIHost == "" && legacyFacturacion.APIHost != ""
	legacyClientID := cfg.FacturacionClientID == "" && legacyFacturacion.ClientID != ""
	legacyClientSecret := cfg.FacturacionClientSecret == "" && legacyFacturacion.ClientSecret != ""
	if legacyAPIHost {
		cfg.FacturacionAPIHost = legacyFacturacion.APIHost
	}
	if legacyClientID {
		cfg.FacturacionClientID = legacyFacturacion.ClientID
	}
	if legacyClientSecret {
		cfg.FacturacionClientSecret = legacyFacturacion.ClientSecret
	}
	// Migración transparente de la primera versión que guardaba el logotipo
	// dentro de receipt.logo. Se extrae al archivo dedicado y se limpia el JSON.
	var legacy struct {
		Receipt struct {
			Logo string `json:"logo"`
		} `json:"receipt"`
	}
	if json.Unmarshal(data, &legacy) == nil && strings.TrimSpace(legacy.Receipt.Logo) != "" {
		if err := SaveReceiptLogo(legacy.Receipt.Logo); err != nil {
			return nil, err
		}
		cleanData, err := json.MarshalIndent(&cfg, "", "  ")
		if err != nil {
			return nil, err
		}
		if err := os.WriteFile(path, cleanData, 0600); err != nil {
			return nil, err
		}
		if err := os.Chmod(path, 0600); err != nil {
			return nil, err
		}
	}
	// El descifrado ocurre después de cualquier migración que reescriba el
	// archivo para garantizar que las credenciales nunca vuelvan a texto plano.
	if strings.HasPrefix(cfg.FacturacionClientID, encryptedSecretPrefix) || strings.HasPrefix(cfg.FacturacionClientSecret, encryptedSecretPrefix) {
		key, err := loadCredentialsKey()
		if err != nil {
			return nil, fmt.Errorf("no se pudo cargar la clave local de facturación: %w", err)
		}
		clientIDField := "facturacionClientId"
		if legacyClientID {
			clientIDField = "billingClientId"
		}
		clientSecretField := "facturacionClientSecret"
		if legacyClientSecret {
			clientSecretField = "billingClientSecret"
		}
		if cfg.FacturacionClientID, err = decryptConfigSecret(cfg.FacturacionClientID, clientIDField, key); err != nil {
			return nil, err
		}
		if cfg.FacturacionClientSecret, err = decryptConfigSecret(cfg.FacturacionClientSecret, clientSecretField, key); err != nil {
			return nil, err
		}
	}
	if legacyAPIHost || legacyClientID || legacyClientSecret {
		if err := SaveKommerzConfig(&cfg); err != nil {
			return nil, fmt.Errorf("no se pudo migrar la configuración de facturación: %w", err)
		}
	}
	return &cfg, nil
}

// SaveKommerzConfig persiste la configuración del dispositivo en disco.
func SaveKommerzConfig(cfg *KommerzConfig) error {
	if strings.TrimSpace(cfg.CloudAPIURL) != "" {
		if err := ValidateCloudAPIURL(cfg.CloudAPIURL); err != nil {
			return err
		}
		cfg.CloudAPIURL = strings.TrimRight(strings.TrimSpace(cfg.CloudAPIURL), "/")
	}
	if strings.TrimSpace(cfg.FacturacionAPIHost) != "" {
		if err := ValidateCloudAPIURL(cfg.FacturacionAPIHost); err != nil {
			return fmt.Errorf("API Host de facturación inválido: %w", err)
		}
		cfg.FacturacionAPIHost = strings.TrimRight(strings.TrimSpace(cfg.FacturacionAPIHost), "/")
	}
	path, err := GetKommerzConfigPath()
	if err != nil {
		return err
	}
	stored := *cfg
	if stored.FacturacionClientID != "" || stored.FacturacionClientSecret != "" {
		key, err := loadOrCreateCredentialsKey()
		if err != nil {
			return fmt.Errorf("no se pudo preparar el cifrado de facturación: %w", err)
		}
		if stored.FacturacionClientID, err = encryptConfigSecret(stored.FacturacionClientID, "facturacionClientId", key); err != nil {
			return err
		}
		if stored.FacturacionClientSecret, err = encryptConfigSecret(stored.FacturacionClientSecret, "facturacionClientSecret", key); err != nil {
			return err
		}
	}
	data, err := json.MarshalIndent(&stored, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(path, data, 0600); err != nil {
		return err
	}
	return os.Chmod(path, 0600)
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

func LoadNetPayCredentials() (*NetPayCredentials, error) {
	cfg, err := LoadKommerzConfig()
	if err != nil {
		return nil, err
	}
	if cfg.NetPayUser == "" || cfg.NetPayPassword == "" || cfg.NetPayStoreId == "" || cfg.NetPayDeviceSerial == "" {
		return nil, os.ErrNotExist
	}
	return &NetPayCredentials{
		NetPayUser:         cfg.NetPayUser,
		NetPayPassword:     cfg.NetPayPassword,
		NetPayStoreId:      cfg.NetPayStoreId,
		NetPayDeviceSerial: cfg.NetPayDeviceSerial,
	}, nil
}

func SaveNetPayCredentials(user, password, storeId, deviceSerial string) error {
	cfg, err := LoadKommerzConfig()
	if err != nil {
		return err
	}
	cfg.NetPayUser = user
	cfg.NetPayPassword = password
	cfg.NetPayStoreId = storeId
	cfg.NetPayDeviceSerial = deviceSerial
	return SaveKommerzConfig(cfg)
}
