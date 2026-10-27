import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, fetchCsrfToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize session by fetching CSRF token and current user
    async function initAuth() {
      try {
        await fetchCsrfToken();
        const res = await api.get('/api/auth/me');
        if (res.success && res.user) {
          setUser(res.user);
        }
      } catch (err) {
        // Not logged in or session expired
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.success && res.user) {
        setUser(res.user);
        return res.user;
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const res = await api.post('/api/auth/register', userData);
      if (res.success && res.user) {
        setUser(res.user);
        return res.user;
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/api/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAdmin: user?.role === 'admin',
        isStudent: user?.role === 'student',
        isAuthenticated: !!user,
        loading,
        error,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
