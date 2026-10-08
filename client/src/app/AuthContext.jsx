import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginAccount, registerAccount } from "../services/authApi.js";

const AuthContext = createContext(null);
const SESSION_KEY = "storylearn.session";

function readSession() {
  const saved = localStorage.getItem(SESSION_KEY);
  if (!saved) return null;

  try {
    const session = JSON.parse(saved);
    return session?.token && session?.user ? session : null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  useEffect(() => {
    function clearExpiredSession() {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
    }
    window.addEventListener("storylearn:unauthorized", clearExpiredSession);
    return () => window.removeEventListener("storylearn:unauthorized", clearExpiredSession);
  }, []);

  function saveSession(nextSession) {
    if (!nextSession?.token || !nextSession?.user) {
      throw new Error("The server returned an incomplete sign-in response.");
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }

  async function register(details) {
    const nextSession = await registerAccount(details);
    saveSession(nextSession);
    return nextSession;
  }

  async function login(credentials) {
    const nextSession = await loginAccount(credentials);
    saveSession(nextSession);
    return nextSession;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  function updateUser(user) {
    setSession((current) => {
      if (!current) return null;
      const next = { ...current, user: { ...current.user, ...user } };
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      return next;
    });
  }

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      register,
      login,
      logout,
      updateUser,
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
