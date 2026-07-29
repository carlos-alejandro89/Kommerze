export const PRODUCT_REQUEST_STORAGE_KEY = 'solicitudProductos';

export function loadProductRequestItems() {
  try {
    const stored = localStorage.getItem(PRODUCT_REQUEST_STORAGE_KEY);
    if (!stored) return {};

    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveProductRequestItems(items) {
  try {
    localStorage.setItem(PRODUCT_REQUEST_STORAGE_KEY, JSON.stringify(items || {}));
  } catch {
    // La solicitud continúa en memoria si el almacenamiento local no está disponible.
  }
}

export function clearProductRequestItems() {
  localStorage.removeItem(PRODUCT_REQUEST_STORAGE_KEY);
}
