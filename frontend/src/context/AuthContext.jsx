import React, { createContext, useContext, useState, useEffect } from 'react';
import authApi from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('docusphere_token') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('docusphere_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Initialize and verify authentication state
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('docusphere_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          if (res.status === 'success' && res.user) {
            setUser(res.user);
            localStorage.setItem('docusphere_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.error('Session expired or invalid user token', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();

    // Listen for session expired events from axios interceptor
    const handleSessionExpired = () => {
      logout();
    };
    window.addEventListener('docusphere-session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('docusphere-session-expired', handleSessionExpired);
    };
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    if (data.status === 'success' && data.access_token) {
      const accessToken = data.access_token;
      localStorage.setItem('docusphere_token', accessToken);
      setToken(accessToken);

      // Fetch full profile with division name
      try {
        const meRes = await authApi.getMe();
        if (meRes.status === 'success' && meRes.user) {
          setUser(meRes.user);
          localStorage.setItem('docusphere_user', JSON.stringify(meRes.user));
          return { success: true, user: meRes.user };
        }
      } catch {
        // Fallback to data.user from login
        setUser(data.user);
        localStorage.setItem('docusphere_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
    }
    return { success: false, message: data.message || 'Login failed' };
  };

  const register = async (formData) => {
    const data = await authApi.register(formData);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('docusphere_token');
    localStorage.removeItem('docusphere_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    divisionId: user?.division_id || null,
    divisionName: user?.division_name || null,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
