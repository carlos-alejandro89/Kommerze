#!/bin/bash
API_BASE_URL="https://kommerze-cloud-api.developers-lab.com"
ENDPOINTS=(
  "/catalogos/lineas/get"
  "/catalogos/empaques/get"
  "/catalogos/marcas/get"
  "/catalogos/sat/productos/get"
  "/catalogos/productos/get"
  "/catalogos/niveles-empaque/get"
  "/catalogos/sat/formas-pago/get"
  "/catalogos/sat/metodos-pago/get"
  "/catalogos/sat/usos-cfdi/get"
  "/catalogos/sat/regimen-fiscal/get"
  "/catalogos/empresas/get"
  "/catalogos/sucursales/get"
)

echo "Validation Report for Central System Synchronization"
echo "API Base URL: $API_BASE_URL"
echo "--------------------------------------------------------"

for EP in "${ENDPOINTS[@]}"; do
  HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" "${API_BASE_URL}${EP}")
  RESPONSE=$(curl -s "${API_BASE_URL}${EP}")
  SUCCESS=$(echo "$RESPONSE" | grep -o '"success":true' || echo '"success":false')
  
  if [ "$HTTP_STATUS" -eq 200 ] && [ "$SUCCESS" == '"success":true' ]; then
    echo "✅ [OK] $EP (HTTP $HTTP_STATUS) - Sincronización exitosa"
  else
    echo "❌ [FAIL] $EP (HTTP $HTTP_STATUS) - Falló"
    echo "   Response: $(echo $RESPONSE | head -c 100)..."
  fi
done
