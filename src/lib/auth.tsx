/**
 * Authentication Context
 * Manejo del estado de autenticación global
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: string | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Función helper para validar token sin importar loginSecurity en la inicialización
function validateTokenSimple(token: string): boolean {
  try {
    // Validar formato (64 caracteres hex)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return false;
    }
    
    // Verificar que el token existe en localStorage
    const storedToken = localStorage.getItem('daes_session_token');
    return storedToken === token;
  } catch (error) {
    console.warn('[AuthProvider] Error validating token:', error);
    return false;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const auth = localStorage.getItem('daes_authenticated') === 'true';
      const token = localStorage.getItem('daes_session_token');
      
      // Validar token de sesión si existe
      if (auth && token) {
        return validateTokenSimple(token);
      }
      
      return false;
    } catch (error) {
      console.error('[AuthProvider] Error initializing auth state:', error);
      return false;
    }
  });
  
  const [user, setUser] = useState<string | null>(() => {
    return localStorage.getItem('daes_user');
  });

  const login = () => {
    setIsAuthenticated(true);
    setUser(localStorage.getItem('daes_user'));
  };

  const logout = () => {
    localStorage.removeItem('daes_authenticated');
    localStorage.removeItem('daes_user');
    localStorage.removeItem('daes_login_time');
    localStorage.removeItem('daes_session_token');
    setIsAuthenticated(false);
    setUser(null);
  };

  // ✅ AUTO-LOGOUT DESHABILITADO
  // La sesión permanece abierta indefinidamente hasta logout manual
  // Esto permite que el Analizador de Archivos Grandes procese archivos
  // de 800+ GB que pueden tardar horas o días sin interrupciones
  
  // ANTES: Auto-logout después de 12 horas (REMOVIDO)
  // useEffect(() => {
  //   if (isAuthenticated) {
  //     const loginTime = localStorage.getItem('daes_login_time');
  //     if (loginTime) {
  //       const elapsed = Date.now() - new Date(loginTime).getTime();
  //       const twelveHours = 12 * 60 * 60 * 1000;
  //       
  //       if (elapsed > twelveHours) {
  //         logout();
  //       } else {
  //         const remaining = twelveHours - elapsed;
  //         const timeout = setTimeout(logout, remaining);
  //         return () => clearTimeout(timeout);
  //       }
  //     }
  //   }
  // }, [isAuthenticated]);

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

