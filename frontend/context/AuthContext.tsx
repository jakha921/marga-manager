
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';
import { authService } from '../api/services/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  organizationId: string | null;
  username: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('km_auth') === 'true';
  });

  const [userRole, setUserRole] = useState<UserRole | null>(() => {
    return (localStorage.getItem('km_role') as UserRole) || null;
  });

  const [organizationId, setOrganizationId] = useState<string | null>(() => {
    return localStorage.getItem('km_org_id') || null;
  });

  const [username, setUsername] = useState<string | null>(() => {
    return localStorage.getItem('km_username') || null;
  });

  const [loading, setLoading] = useState<boolean>(true);

  // On mount, validate existing token
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('km_access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await authService.getMe();
        setIsAuthenticated(true);
        setUserRole(data.role as UserRole);
        setOrganizationId(data.organizationId ? String(data.organizationId) : null);
        setUsername(data.username);

        localStorage.setItem('km_auth', 'true');
        localStorage.setItem('km_role', data.role);
        localStorage.setItem('km_username', data.username);
        if (data.organizationId) {
          localStorage.setItem('km_org_id', String(data.organizationId));
        }
      } catch {
        // Token invalid, clear auth state
        setIsAuthenticated(false);
        setUserRole(null);
        setOrganizationId(null);
        setUsername(null);
        localStorage.removeItem('km_auth');
        localStorage.removeItem('km_role');
        localStorage.removeItem('km_org_id');
        localStorage.removeItem('km_username');
        localStorage.removeItem('km_access_token');
        localStorage.removeItem('km_refresh_token');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  const login = async (inputUser: string, inputPass: string): Promise<boolean> => {
    try {
      const { data } = await authService.login(inputUser, inputPass);

      // Store tokens
      localStorage.setItem('km_access_token', data.access);
      if (data.refresh) {
        localStorage.setItem('km_refresh_token', data.refresh);
      }

      // Parse JWT to extract role and org_id
      const payload = parseJwtPayload(data.access);
      const role = (payload?.role as UserRole) || 'KITCHEN_USER';
      const orgId = payload?.org_id ? String(payload.org_id) : null;
      const name = (payload?.username as string) || inputUser;

      setIsAuthenticated(true);
      setUserRole(role);
      setOrganizationId(orgId);
      setUsername(name);

      // Backward compatibility localStorage keys
      localStorage.setItem('km_auth', 'true');
      localStorage.setItem('km_role', role);
      localStorage.setItem('km_username', name);
      if (orgId) {
        localStorage.setItem('km_org_id', orgId);
      } else {
        localStorage.removeItem('km_org_id');
      }

      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setOrganizationId(null);
    setUsername(null);
    localStorage.removeItem('km_auth');
    localStorage.removeItem('km_role');
    localStorage.removeItem('km_org_id');
    localStorage.removeItem('km_username');
    localStorage.removeItem('km_access_token');
    localStorage.removeItem('km_refresh_token');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, organizationId, username, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
