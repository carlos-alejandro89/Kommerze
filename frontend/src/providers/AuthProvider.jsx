import { useCallback, useMemo, useState, createContext, useContext } from 'react';
import { ServiceLogin } from '../../wailsjs/go/main/App';
import { toast } from 'sonner';

const AuthContext = createContext(undefined);
const SUPER_ADMIN_PROFILE_GUID = 'f0e47c96-4708-46b6-a914-1830e2cfd252';

function getProfileGuid(user) {
  const value = user?.Perfil?.Guid ?? user?.perfil?.guid ?? user?.perfil?.Guid;
  return typeof value === 'string' ? value.toLowerCase() : '';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const permissionSet = useMemo(
    () => new Set(user?.permisos ?? user?.Permisos ?? []),
    [user],
  );

  const isSuperAdmin = useMemo(
    () => getProfileGuid(user) === SUPER_ADMIN_PROFILE_GUID,
    [user],
  );

  const can = useCallback(
    permission => Boolean(permission) && (
      permissionSet.has(permission)
      || (permission === 'configuracion.sincronizar' && isSuperAdmin)
    ),
    [isSuperAdmin, permissionSet],
  );

  const canAny = useCallback(
    permissions => permissions.some(can),
    [can],
  );

  const canAll = useCallback(
    permissions => permissions.every(can),
    [can],
  );

  const login = async (username, password) => {
    try {
      const result = await ServiceLogin(username, password);
      setUser(result);
      toast.success('Sesión iniciada correctamente');
    } catch (error) {
      toast.error(String(error));
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, can, canAny, canAll, permissions: permissionSet, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
