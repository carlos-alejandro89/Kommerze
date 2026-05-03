package services

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type CloudCredentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func GetCloudCredentialsPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}

	appDir := filepath.Join(configDir, "Kommerze")
	err = os.MkdirAll(appDir, 0755)
	if err != nil {
		return "", err
	}

	return filepath.Join(appDir, "cloud_credentials.json"), nil
}

func SaveCloudCredentials(email, password string) error {
	creds := CloudCredentials{
		Email:    email,
		Password: password,
	}

	path, err := GetCloudCredentialsPath()
	if err != nil {
		return err
	}

	data, err := json.Marshal(creds)
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

func LoadCloudCredentials() (*CloudCredentials, error) {
	path, err := GetCloudCredentialsPath()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err // File might not exist yet
	}

	var creds CloudCredentials
	if err := json.Unmarshal(data, &creds); err != nil {
		return nil, err
	}

	return &creds, nil
}
