import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

/** Key used to persist the username in the device's encrypted store. */
const SESSION_KEY = 'gcek_session_username';

interface LoginContextType {
  isLoggedIn: boolean;
  username: string;
  /** True while the initial SecureStore read is in progress — block rendering until false. */
  isRestoringSession: boolean;
  /** Pass persist=true when the user ticked "Keep me logged in". */
  login: (username: string, persist: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const LoginContext = createContext<LoginContextType | undefined>(undefined);

export function LoginProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  /** On mount: restore a persisted session if one exists. */
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(SESSION_KEY);
        if (saved) {
          setIsLoggedIn(true);
          setUsername(saved);
        }
      } catch {
        // SecureStore unavailable (e.g. web fallback error) — treat as logged-out.
      } finally {
        setIsRestoringSession(false);
      }
    })();
  }, []);

  const login = async (user: string, persist: boolean) => {
    setIsLoggedIn(true);
    setUsername(user);
    if (persist) {
      try {
        await SecureStore.setItemAsync(SESSION_KEY, user);
      } catch {
        // Non-fatal: user is still logged in for this session.
      }
    }
  };

  const logout = async () => {
    setIsLoggedIn(false);
    setUsername('');
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch {
      // Ignore — session is cleared in-memory regardless.
    }
  };

  return (
    <LoginContext.Provider value={{ isLoggedIn, username, isRestoringSession, login, logout }}>
      {children}
    </LoginContext.Provider>
  );
}

export function useLogin() {
  const context = useContext(LoginContext);
  if (!context) {
    throw new Error('useLogin must be used within a LoginProvider');
  }
  return context;
}
