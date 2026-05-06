import { useState, createContext, useContext } from 'react';
import { ServiceLogin } from '../../wailsjs/go/main/App';
import { toast } from 'sonner';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

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
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
