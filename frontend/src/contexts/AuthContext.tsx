import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Handle OAuth callback: ?token=... in URL
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        localStorage.setItem('auth_token', token);
        // Clean the token from URL without reload
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.toString());
      }

      // Verify token with backend
      if (localStorage.getItem('auth_token')) {
        try {
          const res = await authApi.getMe();
          setUser(res.data);
        } catch {
          localStorage.removeItem('auth_token');
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const loginWithGoogle = async () => {
    const callbackUrl = window.location.origin;
    const res = await authApi.getGoogleLoginUrl(callbackUrl);
    window.location.href = res.data.url;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { User };

