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
    // 1. Fast check local storage first so UI renders immediately
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("hanumanth_auth_user");
        if (cached) {
          setIsAuthenticated(true);
          setUserName(cached);
          setIsLoading(false);
        }
      }
    } catch {
      // ignore
    }

    // 2. Validate with server with a 1.5-second timeout safety race
    try {
      const serverCheckPromise = checkAuthStatusAction();
      const timeoutPromise = new Promise<{ authenticated: boolean; username: string | null }>((resolve) =>
        setTimeout(() => resolve({ authenticated: false, username: null }), 1500)
      );

      const res = await Promise.race([serverCheckPromise, timeoutPromise]);
      if (res && res.authenticated) {
        setIsAuthenticated(true);
        setUserName(res.username || "Hanumanth (Owner)");
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("hanumanth_auth_user", res.username || "Hanumanth (Owner)");
          }
        } catch {}
      } else {
        if (typeof window !== "undefined" && !localStorage.getItem("hanumanth_auth_user")) {
          setIsAuthenticated(false);
          setUserName(null);
        }
      }
    } catch {
      if (typeof window !== "undefined" && !localStorage.getItem("hanumanth_auth_user")) {
        setIsAuthenticated(false);
        setUserName(null);
      }
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
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("hanumanth_auth_user", name);
      }
    } catch {}
  };

  const logout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("hanumanth_auth_user");
      }
    } catch {}
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
