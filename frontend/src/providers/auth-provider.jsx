import { useState, createContext, useContext } from "react";
import { AuthContext } from "./auth-context";
import { ServiceLogin, ServiceResetPassword } from "../../wailsjs/go/main/App";
import { toast } from 'sonner';
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (username, password) => {
    try {
      const result = await ServiceLogin(username, password);

      setUser(result);
      toast.success('Sesión iniciada correctamente');
    } catch (error) {
      toast.error(error);
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}