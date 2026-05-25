import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoginContextType {
  isLoggedIn: boolean;
  username: string;
  login: (username: string) => void;
  logout: () => void;
}

const LoginContext = createContext<LoginContextType | undefined>(undefined);

export function LoginProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  const login = (user: string) => {
    setIsLoggedIn(true);
    setUsername(user);
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUsername('');
  };

  return (
    <LoginContext.Provider value={{ isLoggedIn, username, login, logout }}>
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
