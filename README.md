# Kommerze

Kommerze es una aplicación de escritorio para la operación comercial de sucursales. Centraliza ventas, cajas, inventario, compras, transferencias, clientes, facturación y cierre de jornada en una sola herramienta.

Está construida con [Wails v2](https://wails.io/) y combina:

- Go para servicios, persistencia y comunicación con Kommerze Cloud.
- React y Vite para la interfaz de usuario.
- PostgreSQL como base de datos local.
- Wails IPC para la comunicación entre React y Go.

## Generar una versión para producción

### 1. Definir la versión

Antes de compilar, actualiza `AppVersion` en `app.go`:

```go
const AppVersion = "1.5.0"
```

La versión debe respetar [SemVer](https://semver.org/), usando el formato `MAYOR.MINOR.PATCH`. Ejemplos válidos: `1.5.0`, `1.5.1` y `2.0.0`.

También se recomienda declarar la misma versión en la sección `info` de `wails.json`, para que los metadatos del ejecutable y del instalador coincidan con la versión utilizada por el actualizador:

```json
{
  "info": {
    "companyName": "Softi Digital",
    "productName": "Kommerze POS",
    "productVersion": "1.5.0",
    "copyright": "© 2026 Kommerze. Todos los derechos reservados.",
    "comments": "Sistema de gestión comercial Kommerze"
  }
}
```

> Cada instalador publicado debe contener realmente la versión anunciada en Cloud. No publiques una versión `1.5.0` apuntando a un ejecutable que todavía tenga `AppVersion = "1.4.2"`, porque la aplicación ofrecerá la actualización nuevamente en cada inicio.

### 2. Preparar dependencias

Instala las dependencias del frontend y verifica el entorno de Wails:

```bash
cd frontend
npm install
cd ..
wails doctor
```

Para crear el instalador de Windows se necesita NSIS. En macOS puede instalarse con:

```bash
brew install nsis
makensis -VERSION
```

### 3. Construir el instalador de Windows

La opción recomendada es compilar desde Windows:

```powershell
wails build -clean -platform windows/amd64 -nsis
```

También se puede realizar una compilación cruzada desde macOS si Go, NSIS y las dependencias requeridas están instaladas:

```bash
wails build -clean -platform windows/amd64 -nsis
```

El instalador se genera en `build/bin`, normalmente con un nombre similar a:

```text
build/bin/Kommerze POS-amd64-installer.exe
```

Renombra el artefacto para identificar claramente la versión y plataforma:

```text
Kommerze-1.5.0-windows-amd64.exe
```

Este mismo instalador sirve tanto para una instalación nueva como para actualizar una instalación existente, siempre que se conserven el nombre del producto y el directorio de instalación.

### 4. Construir el instalador de macOS

Compila la aplicación para Apple Silicon:

```bash
wails build -clean -platform darwin/arm64
```

Después genera un paquete instalable:

```bash
pkgbuild \
  --component "build/bin/Kommerze POS.app" \
  --install-location /Applications \
  "build/bin/Kommerze-1.5.0-darwin-arm64.pkg"
```

Para equipos Intel utiliza `darwin/amd64` y registra un instalador independiente con arquitectura `amd64`.

El actualizador admite archivos `.pkg` y `.dmg`. Para este flujo se recomienda `.pkg`, porque puede utilizarse tanto en instalaciones nuevas como en actualizaciones.

> Mientras los instaladores no estén firmados, Windows SmartScreen y macOS Gatekeeper pueden mostrar advertencias. Incorporar Authenticode o Developer ID/notarización posteriormente no cambia el flujo del actualizador; solamente modifica el proceso de publicación de los artefactos.

## Calcular SHA-256 y tamaño

El actualizador exige el SHA-256 completo de 64 caracteres hexadecimales. Nunca utilices un checksum abreviado.

### macOS

```bash
shasum -a 256 "build/bin/Kommerze-1.5.0-darwin-arm64.pkg"
stat -f%z "build/bin/Kommerze-1.5.0-darwin-arm64.pkg"
```

Para un instalador de Windows generado desde macOS:

```bash
shasum -a 256 "build/bin/Kommerze-1.5.0-windows-amd64.exe"
stat -f%z "build/bin/Kommerze-1.5.0-windows-amd64.exe"
```

### Windows PowerShell

```powershell
Get-FileHash ".\Kommerze-1.5.0-windows-amd64.exe" -Algorithm SHA256
(Get-Item ".\Kommerze-1.5.0-windows-amd64.exe").Length
```

### Linux o servidor Cloud

```bash
sha256sum "Kommerze-1.5.0-windows-amd64.exe"
stat -c%s "Kommerze-1.5.0-windows-amd64.exe"
```

El tamaño debe registrarse en bytes y debe corresponder exactamente al archivo publicado.

## Publicar los instaladores en Kommerze Cloud

El Cloud expone públicamente el contenido del directorio `storage` mediante la ruta `/storage`. Crea, si todavía no existe, el directorio:

```text
KommerzeCloudAPI/storage/updates/
```

Copia ahí los instaladores:

```text
storage/updates/Kommerze-1.5.0-windows-amd64.exe
storage/updates/Kommerze-1.5.0-darwin-arm64.pkg
```

Verifica que cada archivo sea accesible mediante una URL HTTPS directa:

```text
https://core.tiendasayer.com/storage/updates/Kommerze-1.5.0-windows-amd64.exe
https://core.tiendasayer.com/storage/updates/Kommerze-1.5.0-darwin-arm64.pkg
```

La URL almacenada en PostgreSQL debe ser texto plano. No uses sintaxis Markdown como `[https://...](https://...)`.

## Registrar la actualización en PostgreSQL

Sustituye las URLs, hashes y tamaños del siguiente ejemplo por los valores reales:

```sql
BEGIN;

INSERT INTO versiones_aplicacion (
    guid,
    version,
    titulo,
    notas_version,
    obligatoria,
    activa,
    fecha_publicacion,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid()::text,
    '1.5.0',
    'Kommerze 1.5.0',
    ARRAY[
        'Mejoras de rendimiento',
        'Correcciones en ventas',
        'Mejoras en sincronización'
    ],
    false,
    true,
    NOW(),
    NOW(),
    NOW()
)
ON CONFLICT (version) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    notas_version = EXCLUDED.notas_version,
    obligatoria = EXCLUDED.obligatoria,
    activa = EXCLUDED.activa,
    fecha_publicacion = EXCLUDED.fecha_publicacion,
    updated_at = NOW();

INSERT INTO instaladores_aplicacion (
    guid,
    version_aplicacion_id,
    sistema_operativo,
    arquitectura,
    url,
    sha256,
    tamano,
    activo,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid()::text,
    version.id,
    paquete.sistema_operativo,
    paquete.arquitectura,
    paquete.url,
    paquete.sha256,
    paquete.tamano,
    true,
    NOW(),
    NOW()
FROM versiones_aplicacion AS version
CROSS JOIN (
    VALUES
        (
            'windows',
            'amd64',
            'https://core.tiendasayer.com/storage/updates/Kommerze-1.5.0-windows-amd64.exe',
            'SHA256_WINDOWS_DE_64_CARACTERES',
            85000000::bigint
        ),
        (
            'darwin',
            'arm64',
            'https://core.tiendasayer.com/storage/updates/Kommerze-1.5.0-darwin-arm64.pkg',
            'SHA256_MACOS_DE_64_CARACTERES',
            90000000::bigint
        )
) AS paquete(sistema_operativo, arquitectura, url, sha256, tamano)
WHERE version.version = '1.5.0'
ON CONFLICT (version_aplicacion_id, sistema_operativo, arquitectura) DO UPDATE SET
    url = EXCLUDED.url,
    sha256 = EXCLUDED.sha256,
    tamano = EXCLUDED.tamano,
    activo = EXCLUDED.activo,
    updated_at = NOW();

COMMIT;
```

Valores reconocidos actualmente:

| Sistema operativo | Arquitectura | Formatos admitidos |
|---|---|---|
| `windows` | `amd64` | `.exe`, `.msi` |
| `darwin` | `arm64`, `amd64` | `.pkg`, `.dmg` |

El flujo automático de Linux todavía no está habilitado en el cliente. No publiques entradas `linux` hasta implementar el lanzamiento de paquetes `.deb`, `.rpm` o AppImage.

## Verificar la publicación

Comprueba primero que el instalador responda mediante HTTPS y que no redirija a una página HTML:

```bash
curl -I "https://core.tiendasayer.com/storage/updates/Kommerze-1.5.0-windows-amd64.exe"
```

Consulta después el endpoint simulando una instalación anterior:

```bash
curl "https://core.tiendasayer.com/actualizaciones/verificar?version=1.4.2&os=windows&arch=amd64"
```

La respuesta debe contener la versión nueva, la URL HTTPS directa, el SHA-256 completo y el tamaño real:

```json
{
  "success": true,
  "mensaje": "Actualización disponible.",
  "httpCode": 200,
  "data": {
    "version": "1.5.0",
    "title": "Kommerze 1.5.0",
    "releaseNotes": [
      "Mejoras de rendimiento",
      "Correcciones en ventas",
      "Mejoras en sincronización"
    ],
    "mandatory": false,
    "publishedAt": "2026-09-30T12:00:00Z",
    "downloadUrl": "https://core.tiendasayer.com/storage/updates/Kommerze-1.5.0-windows-amd64.exe",
    "sha256": "SHA256_COMPLETO_DE_64_CARACTERES",
    "size": 85000000
  }
}
```

Al consultar con la misma versión publicada:

```bash
curl -i "https://core.tiendasayer.com/actualizaciones/verificar?version=1.5.0&os=windows&arch=amd64"
```

el Cloud debe responder `204 No Content`.

## Lista de comprobación antes de publicar

- `AppVersion` coincide con la versión registrada en Cloud.
- `productVersion` coincide con `AppVersion`.
- El instalador fue generado desde el código definitivo de esa versión.
- La URL utiliza HTTPS y apunta directamente al archivo.
- El SHA-256 contiene exactamente 64 caracteres hexadecimales.
- El tamaño está expresado en bytes y corresponde al archivo publicado.
- Existe un instalador para cada combinación de sistema y arquitectura soportada.
- El endpoint devuelve la actualización para una versión anterior.
- El endpoint devuelve `204` para la versión recién publicada.

## Desarrollo local

Para ejecutar Kommerze en modo desarrollo:

```bash
wails dev
```

La interfaz utiliza Vite con recarga automática y los servicios de Go se exponen al frontend mediante Wails IPC.
