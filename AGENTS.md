# Kommerze — Guía de Arquitectura para Desarrolladores y Agentes IA

## Stack

- **Backend**: Go + Wails v2 (app de escritorio, no HTTP externo)
- **Frontend**: React + Vite (dentro del WebView de Wails)
- **BD**: PostgreSQL vía GORM
- **Comunicación**: Wails IPC — `window.go.main.App.ServiceXxx()` → Promises

---

## Patrón Central: Dual Servidor Local / Caja

**TODA funcionalidad nueva que acceda a datos debe seguir este patrón sin excepción.**

El dispositivo opera en uno de dos modos (`~/.config/Kommerze/kommerze_config.json`):

| Modo | `cfg.Role` | Acceso a BD | `services.CajaProxy` |
|---|---|---|---|
| **Servidor Local** | `"servidor_local"` | Directo (GORM → PostgreSQL) | `nil` |
| **Caja** | `"caja"` | HTTP → Servidor Local :8989 | instanciado |

El código de `app.go` **no sabe ni le importa** qué modo está activo — usa helpers con interfaces anónimas que resuelven la implementación.

---

## Checklist: Nueva Feature Dual (5 pasos en Go + 1 en Frontend)

### Go — 5 archivos a tocar

#### Paso 1 — DTO (si aplica)
```
internal/repository/dto/MiFeatureDto.go
```
```go
package dto

type MiFeatureDto struct {
    ID     uint   `json:"ID"`
    // campos...
}
```

#### Paso 2 — Service directo (acceso a BD)
```
internal/services/mi-feature-service.go
```
```go
package services

type MiFeatureService struct { db *gorm.DB }

func NewMiFeatureService(db *gorm.DB) *MiFeatureService { ... }

func (s *MiFeatureService) HacerAlgo(param string) ([]dto.MiFeatureDto, error) {
    // lógica directa con GORM
}
```

#### Paso 3 — Registrar en `services.go`
```go
// En Services struct:
MiFeature *MiFeatureService   // ← agregar

// En NewServices(), rama Servidor Local:
miFeature := NewMiFeatureService(db)
localServer := NewLocalServerService(pos, auth, catalogos, clientes, miFeature) // ← pasar
return &Services{
    MiFeature: miFeature,  // ← agregar
    // ...resto
}
```

#### Paso 4 — Proxy HTTP en `caja_proxy_service.go`
```go
// Misma firma exacta que MiFeatureService.HacerAlgo
func (c *CajaProxyService) HacerAlgo(param string) ([]dto.MiFeatureDto, error) {
    var result struct {
        Data []dto.MiFeatureDto `json:"data"`
    }
    c.get(fmt.Sprintf("/local/mi-feature/algo?param=%s", param), &result)
    return result.Data, nil
}
```

#### Paso 5 — Endpoint HTTP en `local_server.go` + helper y método en `app.go`

**En `local_server.go`:**
```go
// Struct: agregar campo
miFeature *MiFeatureService

// Constructor: agregar parámetro
func NewLocalServerService(..., miFeature *MiFeatureService) *LocalServerService

// En Start():
mux.HandleFunc("/local/mi-feature/algo", l.handleMiFeatureAlgo)

// Handler:
func (l *LocalServerService) handleMiFeatureAlgo(w http.ResponseWriter, r *http.Request) {
    param := r.URL.Query().Get("param")
    result, err := l.miFeature.HacerAlgo(param)
    if err != nil {
        writeError(w, http.StatusInternalServerError, err.Error())
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result})
}
```

**En `app.go`:**
```go
// Helper con interfaz anónima — el compilador verifica que ambas implementaciones sean compatibles
func (a *App) miFeatureService() interface {
    HacerAlgo(string) ([]dto.MiFeatureDto, error)
} {
    if a.services.CajaProxy != nil {
        return a.services.CajaProxy  // Modo Caja → HTTP
    }
    return a.services.MiFeature      // Modo Servidor Local → BD directa
}

// Método público expuesto al frontend vía Wails IPC
func (a *App) ServiceMiFeatureHacerAlgo(param string) ([]dto.MiFeatureDto, error) {
    return a.miFeatureService().HacerAlgo(param)
}
```

> **Importante:** `wails dev` detecta automáticamente `ServiceMiFeatureHacerAlgo` y regenera
> `frontend/wailsjs/go/main/App.js` y `App.d.ts`. **No editar esos archivos manualmente.**

---

### Frontend — 1 archivo a tocar

#### Agregar al hook `usePosService.js`
```
frontend/src/crm/pages/pos/usePosService.js
```
```js
import { ServiceMiFeatureHacerAlgo } from '../../../../wailsjs/go/main/App';

// En el body del hook:
const hacerAlgo = (param) => ServiceMiFeatureHacerAlgo(param);

// En el return:
return {
    // ...existentes...
    hacerAlgo,
};
```

**Regla:** Los componentes del POS **nunca importan de `wailsjs` directamente**.
Solo lo hace `usePosService.js`.

---

## Cuándo NO usar el patrón dual

Algunas features son exclusivas del Servidor Local y **no necesitan proxy**:

- Sincronización con la nube (`Sync*`)
- Activación de licencia (`License`)
- Operaciones de sucursal (`OperacionesSucursal`)
- Configuración de BD (`ServiceSaveDBConfig`, etc.)

Para estas, en `app.go` se verifica directamente:
```go
func (a *App) ServiceMiFeatureExclusiva() error {
    if a.services.MiFeature == nil {
        return fmt.Errorf("operación no disponible en modo Caja")
    }
    return a.services.MiFeature.HacerAlgo()
}
```

---

## Convenciones de Nombres

| Capa | Convención | Ejemplo |
|---|---|---|
| DTO | `NombreDto` en `dto/` | `ClienteDto` |
| Service | `NombreService` en `services/` | `ClientesService` |
| Helper app.go | `nombreService()` (minúscula) | `clientesService()` |
| Método Wails | `ServiceVerboNombre` (mayúscula) | `ServiceBuscarClientes` |
| Endpoint HTTP | `/local/dominio/accion` | `/local/clientes` |
| Función en hook | camelCase | `buscarClientes` |

---

## Archivos Clave de Referencia

| Archivo | Propósito |
|---|---|
| `app.go` | Todos los métodos públicos expuestos al frontend |
| `internal/services/services.go` | Contenedor de servicios + selección de modo |
| `internal/services/caja_proxy_service.go` | Implementación HTTP para modo Caja |
| `internal/services/local_server.go` | Servidor HTTP :8989 que sirve a las Cajas |
| `frontend/src/crm/pages/pos/usePosService.js` | Hook central del POS |
| `frontend/wailsjs/go/main/App.js` | **Autogenerado** — no editar |
| `frontend/wailsjs/go/main/App.d.ts` | **Autogenerado** — no editar |

---

## Verificación Post-Implementación

1. `wails dev` debe compilar sin errores.
2. El nuevo `ServiceXxx` debe aparecer en `App.js` y `App.d.ts` (autogenerado).
3. En modo **Servidor Local**: la llamada va directo a BD (verificar en logs de GORM).
4. En modo **Caja**: la llamada va a `:8989/local/...` (verificar con curl o logs del LocalServer).
