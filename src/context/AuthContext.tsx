"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { checkAuthStatusAction, logoutUserAction } from "@/app/actions";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userName: string | null;
  login: (name: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  userName: null,
  login: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const res = await checkAuthStatusAction();
      if (res.authenticated) {
        setIsAuthenticated(true);
        setUserName(res.username || "Hanumanth (Owner)");
      } else {
        setIsAuthenticated(false);
        setUserName(null);
      }
    } catch {
      setIsAuthenticated(false);
      setUserName(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (name: string) => {
    setIsAuthenticated(true);
    setUserName(name);
  };

  const logout = async () => {
    try {
      await logoutUserAction();
    } catch (e) {
      console.error(e);
    }
    setIsAuthenticated(false);
    setUserName(null);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, userName, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
