package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"
	requestdto "BitComercio/internal/services/requestDto"
	"bytes"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	gorm "gorm.io/gorm"

	"github.com/denisbrodbeck/machineid"
)

type LicenseService struct {
	apiBaseURL string
	cajaRepo   *repository.CajasRepository
}

func NewLicenseService(db *gorm.DB, apiBaseURL string) *LicenseService {
	repoCajas := repository.NewCajasRepository(db)
	return &LicenseService{
		apiBaseURL: apiBaseURL,
		cajaRepo:   repoCajas,
	}
}

// Estructura que coincide con API de Activacion
type LicenciaInfo struct {
	Guid            string `json:"guid"`
	LicenciaKey     string `json:"licenciaKey"`
	MachineId       string `json:"machineId"`
	FechaExpiracion string `json:"fechaExpiracion"`
}

type SucursalInfo struct {
	Guid     string       `json:"guid"`
	Licencia LicenciaInfo `json:"licencia"`
}

type LicenseData struct {
	Sucursal  SucursalInfo `json:"sucursal"`
	Signature string       `json:"signature"`
}

func GetLicensePath() (string, error) {
	// 1. Obtener la ruta base de configuración del usuario
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}

	// 2. Crear el nombre de la carpeta de tu app
	appDir := filepath.Join(configDir, "Kommerze")

	// 3. Crear la carpeta si no existe (permisos 0755)
	err = os.MkdirAll(appDir, 0755)
	if err != nil {
		return "", err
	}

	// 4. Retornar la ruta completa al archivo
	return filepath.Join(appDir, "licencia.json"), nil
}

func LoadLicense() (*LicenseData, error) {
	licensePath, err := GetLicensePath()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(licensePath)
	if err != nil {
		return nil, err
	}

	var lic LicenseData
	// Convierte el JSON en el struct
	err = json.Unmarshal(data, &lic)
	if err != nil {
		return nil, err
	}

	return &lic, nil
}

func GetMachineID() (string, error) {
	id, err := machineid.ProtectedID("Kommerze")
	if err != nil {
		return "", err
	}
	return id, nil
}

func VerifyLicense() *dto.ResponseDto {
	loadLicense, err := LoadLicense()
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	machineID, err := GetMachineID()
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	if loadLicense.Sucursal.Licencia.MachineId != machineID {
		return dto.NewResponseDto(false, "Licencia no corresponde a este equipo", nil, []string{"Licencia no corresponde a este equipo"})
	}

	// 1. Parsear la fecha ISO 8601 y reformatear a "yyyy-MM-dd HH:mm:ss" (formato que firma el servidor C#)
	parsedDate, err := time.Parse(time.RFC3339Nano, loadLicense.Sucursal.Licencia.FechaExpiracion)
	if err != nil {
		// Intentar sin nanosegundos por si acaso
		parsedDate, err = time.Parse(time.RFC3339, loadLicense.Sucursal.Licencia.FechaExpiracion)
		if err != nil {
			return dto.NewResponseDto(false, fmt.Errorf("fecha de expiración inválida: %v", err).Error(), nil, []string{err.Error()})
		}
	}
	expirationFormatted := parsedDate.UTC().Format("2006-01-02 15:04:05")

	// 2. Construir payload: machineId|licenciaKey|expirationDate
	payload := fmt.Sprintf("%s|%s|%s",
		loadLicense.Sucursal.Licencia.MachineId,
		loadLicense.Sucursal.Licencia.LicenciaKey,
		expirationFormatted,
	)
	fmt.Printf("[VerifyLicense] Payload: %s\n", payload)

	// 3. Llave pública Ed25519
	publicKeyHex := os.Getenv("PUBLIC_KEY")
	pubKeyBytes, err := hex.DecodeString(publicKeyHex)
	if err != nil {
		return dto.NewResponseDto(false, fmt.Errorf("error en llave pública: %v", err).Error(), nil, []string{err.Error()})
	}
	pubKey := ed25519.PublicKey(pubKeyBytes)

	// 4. Decodificar firma de Base64
	sig, err := base64.StdEncoding.DecodeString(loadLicense.Signature)
	if err != nil {
		return dto.NewResponseDto(false, fmt.Errorf("firma inválida: %v", err).Error(), nil, []string{err.Error()})
	}

	// 5. Verificación criptográfica
	isValid := ed25519.Verify(pubKey, []byte(payload), sig)
	fmt.Printf("[VerifyLicense] Firma válida: %v\n", isValid)

	if !isValid {
		return dto.NewResponseDto(false, "Firma inválida", nil, []string{"Firma inválida"})
	}

	return dto.NewResponseDto(true, "Licencia válida", loadLicense, nil)
}

func (l *LicenseService) ActivateLicense(licenseKey requestdto.ActivateLicenseRequest) (any, error) {
	apiReq := struct {
		LicenseKey        string `json:"LicenseKey"`
		NombreDispositivo string `json:"NombreDispositivo"`
		MachineId         string `json:"MachineId"`
	}{
		LicenseKey:        licenseKey.LicenseKey,
		NombreDispositivo: licenseKey.DeviceName,
		MachineId:         licenseKey.MachineId,
	}

	requestBody, err := json.Marshal(apiReq)
	if err != nil {
		panic(err)
	}

	resp, err := http.Post(fmt.Sprintf("%s/api/v1/licencias/activacion", l.apiBaseURL), "application/json", bytes.NewBuffer(requestBody))

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	fmt.Printf("RAW API RESPONSE: %s\n", string(bodyBytes))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		Success  bool   `json:"success"`
		Mensaje  string `json:"mensaje"`
		HttpCode int    `json:"httpCode"`
		Data     any    `json:"data"`
	}
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	path, err := GetLicensePath()
	if err != nil {
		return nil, fmt.Errorf("error getting license path: %w", err)
	}

	jsonData, err := json.Marshal(result.Data)
	if err != nil {
		return nil, fmt.Errorf("error marshaling license: %w", err)
	}

	os.WriteFile(path, jsonData, 0644)

	model := models.Caja{
		Clave:    licenseKey.MachineId,
		Nombre:   licenseKey.DeviceName,
		Activa:   true,
		Licencia: licenseKey.LicenseKey,
	}

	err = l.cajaRepo.ActivarCaja(model)
	if err != nil {
		return nil, err
	}

	return result.Data, nil
}
