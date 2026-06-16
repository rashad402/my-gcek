import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { loginToEtlab, validateSession, logoutFromEtlab } from '@/services/etlab-api';
import { dataCache } from '@/services/data-cache';

// ─── SecureStore keys ───────────────────────────────────────────────────────

/** Persists only the username (display purposes). */
const KEY_USERNAME = 'gcek_session_username';

/** Persists the authenticated session flag ("Keep me logged in"). */
const KEY_IS_LOGGED_IN = 'gcek_is_logged_in';

/** Persists the student-specific ID used for attendance URLs. */
const KEY_STUDENT_ID = 'gcek_student_id';

/** Persists the password securely for silent background re-authentication. */
const KEY_PASSWORD = 'gcek_session_password';

// ─── Context type ───────────────────────────────────────────────────────────

interface LoginContextType {
  isLoggedIn: boolean;
  username: string;
  /** Student-specific numeric ID used in attendance URLs. */
  studentId: string;
  /** True while the initial SecureStore / session validation is in progress. */
  isRestoringSession: boolean;
  /**
   * Authenticate against ETLAB.
   *
   * @param username  Student ID or email
   * @param password  Used transiently — NEVER stored
   * @param persist   If true, saves login flag to SecureStore ("Keep me logged in")
   */
  login: (username: string, password: string, persist: boolean) => Promise<{ success: boolean; error?: string }>;
  /** Clear the session and return to the login screen. */
  logout: () => Promise<void>;
  /** Call when a data screen detects a session-expiry redirect. */
  handleSessionExpired: () => void | Promise<void>;
}

const LoginContext = createContext<LoginContextType | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function LoginProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // ── Restore persisted session on mount ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const savedLoggedIn = await SecureStore.getItemAsync(KEY_IS_LOGGED_IN);
        const savedUsername = await SecureStore.getItemAsync(KEY_USERNAME);
        const savedStudentId = await SecureStore.getItemAsync(KEY_STUDENT_ID);

        if (savedLoggedIn === 'true' && savedUsername) {
          // 1. Immediately restore UI from cache optimistically
          await dataCache.loadFromStorage();
          setIsLoggedIn(true);
          setUsername(savedUsername);
          setStudentId(savedStudentId || '');
          setIsRestoringSession(false);

          // 2. Validate in the background, attempt silent re-login if expired
          validateSession().then(async (status) => {
            if (status === 'expired') {
              const savedPassword = await SecureStore.getItemAsync(KEY_PASSWORD);
              if (savedPassword) {
                console.log('[Auth] Background session expired. Attempting silent re-login...');
                const res = await loginToEtlab(savedUsername, savedPassword, true);
                if (res.success) {
                  console.log('[Auth] Silent background re-login successful.');
                  return;
                }
              }

              console.log('[Auth] Background check determined session is expired and re-login failed. Logging out.');
              setIsLoggedIn(false);
              setUsername('');
              setStudentId('');
              await dataCache.clear();
              await logoutFromEtlab();
              await clearPersistedSession();
              Alert.alert(
                'Session Expired',
                'Your saved session has expired. Please log in again.',
              );
            } else {
              console.log('[Auth] Background session check result:', status);
            }
          }).catch((err) => {
            console.warn('[Auth] Background session check failed (offline?):', err);
          });
        } else {
          // No active session — clear cache and session flags to be safe
          await dataCache.clear();
          await clearPersistedSession();
          setIsRestoringSession(false);
        }
      } catch {
        // SecureStore unavailable — treat as logged-out
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
      // Clear cache before authenticating to prevent cross-user contamination
      await dataCache.clear();

      const result = await loginToEtlab(user, password, persist);

      if (result.success) {
        console.log('[Auth] Login successful');
        setIsLoggedIn(true);
        setUsername(user);
        setStudentId(result.studentId);

        if (persist) {
          try {
            await SecureStore.setItemAsync(KEY_USERNAME, user);
            await SecureStore.setItemAsync(KEY_IS_LOGGED_IN, 'true');
            await SecureStore.setItemAsync(KEY_PASSWORD, password);
            
            if (result.studentId) {
              await SecureStore.setItemAsync(KEY_STUDENT_ID, result.studentId);
            }
          } catch {
            // Non-fatal: user is still logged in for this session.
          }
        }

        return { success: true };
      }

      console.log('[Auth] Login failed:', result.error);
      return { success: false, error: result.error };
    } catch (error: any) {
      // Network / unexpected errors
      const isTimeout = error?.name === 'AbortError' || error?.message?.includes('timeout') || error?.message?.includes('timed out');
      const message = isTimeout
        ? 'Connection timed out. GCEK ETLAB is taking too long to respond. Please try again.'
        : error?.message?.includes('Network request failed') ||
          error?.message?.includes('fetch')
          ? 'Unable to connect to ETLAB. Please check your internet connection.'
          : 'An unexpected error occurred. Please try again.';
      console.log('[Auth] Login error:', message);
      return { success: false, error: message };
    }
  };

  // ── Logout ──────────────────────────────────────────────────────────
  const logout = async () => {
    console.log('[Auth] Logging out user and invalidating session');
    setIsLoggedIn(false);
    setUsername('');
    setStudentId('');
    await logoutFromEtlab();
    await dataCache.clear();
    await clearPersistedSession();
  };

  // ── Session expiry handler ──────────────────────────────────────────
  const handleSessionExpired = async () => {
    if (!isLoggedIn) return;
    const status = await validateSession();
    if (status === 'expired') {
      const savedPassword = await SecureStore.getItemAsync(KEY_PASSWORD);
      if (savedPassword) {
        console.log('[Auth] Active session expired. Attempting silent re-login...');
        const res = await loginToEtlab(username, savedPassword, true);
        if (res.success) {
          console.log('[Auth] Silent active re-login successful.');
          return;
        }
      }

      console.log('[Auth] Session expired and invalidated. Prompting user for login.');
      Alert.alert('Session Expired', 'Please log in again.', [
        { text: 'OK', onPress: () => logout() },
      ]);
    }
  };

  return (
    <LoginContext.Provider
      value={{
        isLoggedIn,
        username,
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
    await SecureStore.deleteItemAsync(KEY_IS_LOGGED_IN);
    await SecureStore.deleteItemAsync(KEY_STUDENT_ID);
    await SecureStore.deleteItemAsync(KEY_PASSWORD);
  } catch {
    // Ignore — session is cleared in-memory regardless.
  }
}
