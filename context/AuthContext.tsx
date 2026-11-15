"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/stray';

interface AuthContextType {
  user: UserProfile | null;
  login: (userData: UserProfile) => void;
  logout: () => void;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isSuperAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Restore user session from localStorage
    const stored = localStorage.getItem('straybuddy_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse cached user', e);
      }
    }
  }, []);

  const login = (userData: UserProfile) => {
    setUser(userData);
    localStorage.setItem('straybuddy_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('straybuddy_user');
  };

  // Admin tools are decided by the role only — never by a username.
  const isSuperAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <AuthContext.Provider value={{ user, login, logout, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
