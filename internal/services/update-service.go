package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/Masterminds/semver/v3"
)

const updateEndpoint = "/actualizaciones/verificar"

type UpdatePackage struct {
	URL    string `json:"url"`
	SHA256 string `json:"sha256"`
	Size   int64  `json:"size,omitempty"`
}

type AvailableUpdate struct {
	Version      string                   `json:"version"`
	Title        string                   `json:"title,omitempty"`
	ReleaseNotes []string                 `json:"releaseNotes,omitempty"`
	Mandatory    bool                     `json:"mandatory,omitempty"`
	PublishedAt  *time.Time               `json:"publishedAt,omitempty"`
	URL          string                   `json:"url,omitempty"`
	DownloadURL  string                   `json:"downloadUrl,omitempty"`
	SHA256       string                   `json:"sha256,omitempty"`
	Size         int64                    `json:"size,omitempty"`
	Packages     map[string]UpdatePackage `json:"packages,omitempty"`
}

type UpdateProgress struct {
	Stage      string  `json:"stage"`
	Percentage float64 `json:"percentage"`
	Downloaded int64   `json:"downloaded"`
	Total      int64   `json:"total"`
}

type UpdateService struct {
	apiURL     string
	version    string
	client     *http.Client
	mu         sync.Mutex
	current    *AvailableUpdate
	installing bool
}

func NewUpdateService(apiURL, currentVersion string) *UpdateService {
	return &UpdateService{
		apiURL:  strings.TrimRight(apiURL, "/"),
		version: currentVersion,
		client:  &http.Client{Timeout: 30 * time.Second},
	}
}

func (s *UpdateService) Current() *AvailableUpdate {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.current == nil {
		return nil
	}
	copy := *s.current
	return &copy
}

func (s *UpdateService) CheckForUpdates(ctx context.Context) (*AvailableUpdate, error) {
	current, err := semver.NewVersion(strings.TrimPrefix(strings.TrimSpace(s.version), "v"))
	if err != nil {
		return nil, fmt.Errorf("versión local inválida: %w", err)
	}
	endpoint, err := url.Parse(s.apiURL + updateEndpoint)
	if err != nil {
		return nil, err
	}
	query := endpoint.Query()
	query.Set("version", current.String())
	query.Set("os", runtime.GOOS)
	query.Set("arch", runtime.GOARCH)
	endpoint.RawQuery = query.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "Kommerze/"+current.String())
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNoContent || resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("consulta de actualización respondió %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var envelope struct {
		Data json.RawMessage `json:"data"`
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, fmt.Errorf("respuesta de actualización inválida: %w", err)
	}
	payload := body
	if len(envelope.Data) > 0 && string(envelope.Data) != "null" {
		payload = envelope.Data
	}
	var update AvailableUpdate
	if err := json.Unmarshal(payload, &update); err != nil {
		return nil, fmt.Errorf("manifiesto de actualización inválido: %w", err)
	}
	latest, err := semver.NewVersion(strings.TrimPrefix(strings.TrimSpace(update.Version), "v"))
	if err != nil || !latest.GreaterThan(current) {
		return nil, nil
	}
	platformKey := runtime.GOOS + "-" + runtime.GOARCH
	if pkg, ok := update.Packages[platformKey]; ok {
		update.DownloadURL, update.SHA256, update.Size = pkg.URL, pkg.SHA256, pkg.Size
	}
	if update.DownloadURL == "" {
		update.DownloadURL = update.URL
	}
	if err := validateUpdatePackage(update.DownloadURL, update.SHA256); err != nil {
		return nil, err
	}
	update.Version = latest.String()
	s.mu.Lock()
	s.current = &update
	s.mu.Unlock()
	copy := update
	return &copy, nil
}

func validateUpdatePackage(downloadURL, checksum string) error {
	parsed, err := url.Parse(strings.TrimSpace(downloadURL))
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return fmt.Errorf("el instalador debe publicarse mediante una URL HTTPS válida")
	}
	decoded, err := hex.DecodeString(strings.TrimSpace(checksum))
	if err != nil || len(decoded) != sha256.Size {
		return fmt.Errorf("el manifiesto no contiene un SHA-256 válido")
	}
	return nil
}

func (s *UpdateService) DownloadAndLaunch(ctx context.Context, progress func(UpdateProgress)) error {
	s.mu.Lock()
	if s.installing {
		s.mu.Unlock()
		return fmt.Errorf("ya hay una actualización en proceso")
	}
	if s.current == nil {
		s.mu.Unlock()
		return fmt.Errorf("no hay una actualización validada disponible")
	}
	update := *s.current
	s.installing = true
	s.mu.Unlock()
	defer func() {
		s.mu.Lock()
		s.installing = false
		s.mu.Unlock()
	}()

	client := &http.Client{Timeout: 30 * time.Minute}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, update.DownloadURL, nil)
	if err != nil {
		return err
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("no se pudo descargar el instalador: %w", err)
	}
	defer resp.Body.Close()
	if resp.Request.URL.Scheme != "https" {
		return fmt.Errorf("la descarga fue redirigida fuera de HTTPS")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("la descarga respondió con el estado %d", resp.StatusCode)
	}
	total := resp.ContentLength
	if update.Size > 0 {
		total = update.Size
	}
	dir, err := os.MkdirTemp("", "kommerze-update-*")
	if err != nil {
		return err
	}
	launched := false
	defer func() {
		if !launched {
			_ = os.RemoveAll(dir)
		}
	}()
	installerPath := filepath.Join(dir, installerFilename(update.DownloadURL))
	file, err := os.OpenFile(installerPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	hash := sha256.New()
	reader := &progressReader{reader: resp.Body, total: total, notify: progress}
	_, copyErr := io.Copy(io.MultiWriter(file, hash), reader)
	closeErr := file.Close()
	if copyErr != nil {
		return fmt.Errorf("descarga incompleta: %w", copyErr)
	}
	if closeErr != nil {
		return closeErr
	}
	if progress != nil {
		progress(UpdateProgress{Stage: "verifying", Percentage: 100, Downloaded: reader.read, Total: total})
	}
	expected, _ := hex.DecodeString(strings.TrimSpace(update.SHA256))
	if !equalBytes(hash.Sum(nil), expected) {
		_ = os.Remove(installerPath)
		return fmt.Errorf("el instalador descargado no coincide con el SHA-256 publicado")
	}
	if err := launchInstaller(installerPath); err != nil {
		return err
	}
	launched = true
	if progress != nil {
		progress(UpdateProgress{Stage: "launching", Percentage: 100, Downloaded: reader.read, Total: total})
	}
	return nil
}

type progressReader struct {
	reader io.Reader
	total  int64
	read   int64
	notify func(UpdateProgress)
	last   int
}

func (r *progressReader) Read(p []byte) (int, error) {
	n, err := r.reader.Read(p)
	r.read += int64(n)
	percentage := 0
	if r.total > 0 {
		percentage = int(float64(r.read) * 100 / float64(r.total))
	}
	if r.notify != nil && (percentage != r.last || err == io.EOF) {
		r.last = percentage
		r.notify(UpdateProgress{Stage: "downloading", Percentage: float64(percentage), Downloaded: r.read, Total: r.total})
	}
	return n, err
}

func installerFilename(rawURL string) string {
	parsed, _ := url.Parse(rawURL)
	name := filepath.Base(parsed.Path)
	if name == "." || name == "/" || name == "" {
		if runtime.GOOS == "windows" {
			return "KommerzeUpdate.exe"
		}
		return "KommerzeUpdate.pkg"
	}
	return name
}

func launchInstaller(path string) error {
	ext := strings.ToLower(filepath.Ext(path))
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		if ext == ".msi" {
			cmd = exec.Command("msiexec.exe", "/i", path)
		} else if ext == ".exe" {
			cmd = exec.Command(path)
		} else {
			return fmt.Errorf("formato de instalador de Windows no admitido: %s", ext)
		}
	case "darwin":
		if ext != ".pkg" && ext != ".dmg" {
			return fmt.Errorf("formato de instalador de macOS no admitido: %s", ext)
		}
		cmd = exec.Command("open", path)
	default:
		return fmt.Errorf("las actualizaciones automáticas aún no están disponibles para %s", runtime.GOOS)
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("no se pudo iniciar el instalador: %w", err)
	}
	return nil
}

func equalBytes(a, b []byte) bool {
	if len(a) != len(b) {
		return false
	}
	var different byte
	for i := range a {
		different |= a[i] ^ b[i]
	}
	return different == 0
}
