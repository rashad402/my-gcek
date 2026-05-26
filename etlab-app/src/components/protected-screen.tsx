import React from 'react';
import { Redirect } from 'expo-router';
import { useLogin } from './login-context';

/**
 * Route-level auth guard.
 * Wrap any screen that requires authentication with this component.
 * Unauthenticated users are hard-redirected to "/" (the login screen)
 * instead of just hiding navigation links in the tab bar.
 */
export function ProtectedScreen({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useLogin();

  if (!isLoggedIn) {
    return <Redirect href="/" />;
  }

  return <>{children}</>;
}
