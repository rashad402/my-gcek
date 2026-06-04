import React from 'react';
import { useLogin } from '@/components/login-context';
import LoginScreen from '@/components/login-screen';
import AttendanceDashboard from '@/components/attendance-dashboard';

export default function HomeScreen() {
  const { isLoggedIn } = useLogin();

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return <AttendanceDashboard />;
}
