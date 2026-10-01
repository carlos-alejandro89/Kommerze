import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ServiceGetKommerzConfig } from '../../wailsjs/go/main/App';

const CloudConfigContext = createContext(undefined);

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

export function resolveCloudAssetUrl(baseUrl, path) {
  const resource = String(path || '').trim();
  if (!resource) return '';
  if (/^(https?:|data:|blob:)/i.test(resource)) return resource;

  const base = normalizeBaseUrl(baseUrl);
  if (!base) return '';
  return `${base}/${resource.replace(/^\/+/, '')}`;
}

export function CloudConfigProvider({ children }) {
  const [cloudApiUrl, setCloudApiUrlState] = useState('');

  const setCloudApiUrl = useCallback((value) => {
    setCloudApiUrlState(normalizeBaseUrl(value));
  }, []);

  const refreshCloudConfig = useCallback(async () => {
    const config = await ServiceGetKommerzConfig();
    setCloudApiUrl(config?.cloudApiUrl || '');
    return config;
  }, [setCloudApiUrl]);

  useEffect(() => {
    refreshCloudConfig().catch((error) => {
      console.warn('[CloudConfigProvider] No se pudo cargar cloudApiUrl:', error);
    });
  }, [refreshCloudConfig]);

  const getCloudAssetUrl = useCallback(
    (path) => resolveCloudAssetUrl(cloudApiUrl, path),
    [cloudApiUrl],
  );

  const value = useMemo(() => ({
    cloudApiUrl,
    setCloudApiUrl,
    refreshCloudConfig,
    getCloudAssetUrl,
  }), [cloudApiUrl, getCloudAssetUrl, refreshCloudConfig, setCloudApiUrl]);

  return <CloudConfigContext.Provider value={value}>{children}</CloudConfigContext.Provider>;
}

export function useCloudConfig() {
  const context = useContext(CloudConfigContext);
  if (!context) throw new Error('useCloudConfig debe utilizarse dentro de CloudConfigProvider');
  return context;
}
