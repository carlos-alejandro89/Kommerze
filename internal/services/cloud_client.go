package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
)

type CloudHttpClient struct {
	apiBaseURL string
	token      string
	client     *http.Client
	mu         sync.Mutex
}

func NewCloudHttpClient(apiBaseURL string) *CloudHttpClient {
	return &CloudHttpClient{
		apiBaseURL: apiBaseURL,
		client:     &http.Client{},
	}
}

func (c *CloudHttpClient) Login() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	creds, err := LoadCloudCredentials()
	if err != nil {
		return fmt.Errorf("no se han configurado credenciales en la nube: %w", err)
	}

	payload, err := json.Marshal(map[string]string{
		"email":    creds.Email,
		"password": creds.Password,
	})
	if err != nil {
		return err
	}

	resp, err := c.client.Post(fmt.Sprintf("%s/auth/login", c.apiBaseURL), "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("error al iniciar sesión: status %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("error leyendo respuesta de login: %w", err)
	}

	var mapResult map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &mapResult); err != nil {
		return fmt.Errorf("no se pudo decodificar la respuesta JSON: %w", err)
	}

	if t, ok := mapResult["token"].(string); ok {
		c.token = t
		return nil
	}

	if data, ok := mapResult["data"].(map[string]interface{}); ok {
		if t, ok := data["token"].(string); ok {
			c.token = t
			return nil
		}
	}

	return fmt.Errorf("no se encontró el token en la respuesta: %s", string(bodyBytes))
}

func (c *CloudHttpClient) Do(req *http.Request) (*http.Response, error) {
	c.mu.Lock()
	token := c.token
	c.mu.Unlock()

	if token == "" {
		if err := c.Login(); err != nil {
			return nil, err
		}
		c.mu.Lock()
		token = c.token
		c.mu.Unlock()
	}

	req.Header.Set("Authorization", "Bearer "+token)

	// Clonar body para posible reintento
	var bodyBytes []byte
	if req.Body != nil {
		bodyBytes, _ = io.ReadAll(req.Body)
		req.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode == http.StatusUnauthorized {
		resp.Body.Close()

		// El token caducó o es inválido, iniciar sesión nuevamente
		if err := c.Login(); err != nil {
			return nil, err
		}

		c.mu.Lock()
		token = c.token
		c.mu.Unlock()

		req.Header.Set("Authorization", "Bearer "+token)
		if bodyBytes != nil {
			req.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		return c.client.Do(req)
	}

	return resp, nil
}

func (c *CloudHttpClient) Get(url string) (*http.Response, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	return c.Do(req)
}

func (c *CloudHttpClient) Post(url string, contentType string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequest(http.MethodPost, url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", contentType)
	return c.Do(req)
}
