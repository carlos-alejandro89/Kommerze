package services

import (
	requestdto "BitComercio/internal/services/requestDto"
	"bytes"
	"encoding/json"
	"io"

	"crypto/ed25519"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/denisbrodbeck/machineid"
)

type LicenseService struct {
	apiBaseURL string
}

func NewLicenseService(apiBaseURL string) *LicenseService {
	return &LicenseService{
		apiBaseURL: apiBaseURL,
	}
}

// Estructura que coincide con API de Activacion
type LicenseData struct {
	MachineID      string
	LicenseKey     string
	ExpirationDate string
	Signature      string
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

func VerifyLicense() (bool, error) {
	loadLicense, err := LoadLicense()
	if err != nil {
		return false, err
	}

	publicKeyHex := os.Getenv("PUBLIC_KEY")
	// 1. Convertir la llave pública de Hex a Bytes
	pubKeyBytes, err := hex.DecodeString(publicKeyHex)
	if err != nil {
		return false, fmt.Errorf("error en llave pública: %v", err)
	}
	pubKey := ed25519.PublicKey(pubKeyBytes)

	// 2. Reconstruir el "payload" EXACTAMENTE como lo hizo el servidor C#
	// Formato: machine_id|license_key|expires_at
	// string payload = $"{machineId}|{licenseKey}|{expiration.ToString("yyyy-MM-ddTHH:mm:ss")}";
	payload := fmt.Sprintf("%s|%s|%s", loadLicense.MachineID, loadLicense.LicenseKey, loadLicense.ExpirationDate)
	message := []byte(payload)

	fmt.Println("MachineID: ", loadLicense.MachineID)
	fmt.Println("LicenseKey: ", loadLicense.LicenseKey)
	fmt.Println("ExpirationDate: ", loadLicense.ExpirationDate)
	fmt.Println("Signature: ", loadLicense.Signature)
	fmt.Println("Payload: ", payload)

	// 3. Decodificar la firma de Base64 (que envió el servidor)
	sig, err := base64.StdEncoding.DecodeString(loadLicense.Signature)
	if err != nil {
		return false, fmt.Errorf("firma inválida: %v", err)
	}

	// 4. Verificación Criptográfica
	isValid := ed25519.Verify(pubKey, message, sig)

	return isValid, nil
}

func (l *LicenseService) ActivateLicense(licenseKey requestdto.ActivateLicenseRequest) (any, error) {
	requestBody, err := json.Marshal(licenseKey)
	if err != nil {
		panic(err)
	}

	resp, err := http.Post(fmt.Sprintf("%s/api/v1/licencias/activacion", l.apiBaseURL), "application/json", bytes.NewBuffer(requestBody))

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		Success  bool   `json:"success"`
		Mensaje  string `json:"mensaje"`
		HttpCode int    `json:"httpCode"`
		Data     any    `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
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

	return result.Data, nil
}
