import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { loginToEtlab, validateSession } from '@/services/etlab-api';

// ─── SecureStore keys ───────────────────────────────────────────────────────

/** Persists only the username (display purposes). */
const KEY_USERNAME = 'gcek_session_username';

/** Persists the authenticated session cookies (NOT the password). */
const KEY_COOKIES = 'gcek_session_cookies';

/** Persists the student-specific ID used for attendance URLs. */
const KEY_STUDENT_ID = 'gcek_student_id';

// ─── Context type ───────────────────────────────────────────────────────────

interface LoginContextType {
  isLoggedIn: boolean;
  username: string;
  /** Authenticated session cookies for ETLAB API calls. */
  sessionCookies: string;
  /** Student-specific numeric ID used in attendance URLs. */
  studentId: string;
  /** True while the initial SecureStore / session validation is in progress. */
  isRestoringSession: boolean;
  /**
   * Authenticate against ETLAB.
   *
   * @param username  Student ID or email
   * @param password  Used transiently — NEVER stored
   * @param persist   If true, saves session cookies to SecureStore ("Keep me logged in")
   */
  login: (username: string, password: string, persist: boolean) => Promise<{ success: boolean; error?: string }>;
  /** Clear the session and return to the login screen. */
  logout: () => Promise<void>;
  /** Call when a data screen detects a session-expiry redirect. */
  handleSessionExpired: () => void;
}

const LoginContext = createContext<LoginContextType | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function LoginProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [sessionCookies, setSessionCookies] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // ── Restore persisted session on mount ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const savedCookies = await SecureStore.getItemAsync(KEY_COOKIES);
        const savedUsername = await SecureStore.getItemAsync(KEY_USERNAME);
        const savedStudentId = await SecureStore.getItemAsync(KEY_STUDENT_ID);

        if (savedCookies && savedUsername) {
          // Validate the saved session is still alive
          const valid = await validateSession(savedCookies);
          if (valid) {
            setIsLoggedIn(true);
            setUsername(savedUsername);
            setSessionCookies(savedCookies);
            setStudentId(savedStudentId || '');
          } else {
            // Session expired — clear persisted data
            await clearPersistedSession();
            Alert.alert(
              'Session Expired',
              'Your saved session has expired. Please log in again.',
            );
          }
        }
      } catch {
        // SecureStore unavailable — treat as logged-out
      } finally {
        setIsRestoringSession(false);
      }
    })();
  }, []);

  // ── Login ───────────────────────────────────────────────────────────
  const login = async (
    user: string,
    password: string,
    persist: boolean,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await loginToEtlab(user, password, persist);

      if (result.success) {
        setIsLoggedIn(true);
        setUsername(user);
        setSessionCookies(result.cookies);
        setStudentId(result.studentId);

        if (persist) {
          try {
            await SecureStore.setItemAsync(KEY_USERNAME, user);
            await SecureStore.setItemAsync(KEY_COOKIES, result.cookies);
            if (result.studentId) {
              await SecureStore.setItemAsync(KEY_STUDENT_ID, result.studentId);
            }
          } catch {
            // Non-fatal: user is still logged in for this session.
          }
        }

        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error: any) {
      // Network / unexpected errors
      const message =
        error?.message?.includes('Network request failed') ||
        error?.message?.includes('fetch')
          ? 'Unable to connect to ETLAB. Please check your internet connection.'
          : 'An unexpected error occurred. Please try again.';
      return { success: false, error: message };
    }
  };

  // ── Logout ──────────────────────────────────────────────────────────
  const logout = async () => {
    setIsLoggedIn(false);
    setUsername('');
    setSessionCookies('');
    setStudentId('');
    await clearPersistedSession();
  };

  // ── Session expiry handler ──────────────────────────────────────────
  const handleSessionExpired = () => {
    Alert.alert('Session Expired', 'Please log in again.', [
      { text: 'OK', onPress: () => logout() },
    ]);
  };

  return (
    <LoginContext.Provider
      value={{
        isLoggedIn,
        username,
        sessionCookies,
        studentId,
        isRestoringSession,
        login,
        logout,
        handleSessionExpired,
      }}
    >
      {children}
    </LoginContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useLogin() {
  const context = useContext(LoginContext);
  if (!context) {
    throw new Error('useLogin must be used within a LoginProvider');
  }
  return context;
}

// ─── Internal helpers ───────────────────────────────────────────────────────

async function clearPersistedSession() {
  try {
    await SecureStore.deleteItemAsync(KEY_USERNAME);
    await SecureStore.deleteItemAsync(KEY_COOKIES);
    await SecureStore.deleteItemAsync(KEY_STUDENT_ID);
  } catch {
    // Ignore — session is cleared in-memory regardless.
  }
}
