import { db } from '@/lib/db';
import { convexChat } from '@/lib/convexChat';

import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    db.auth.me()
      .then((u) => {
        setUser(u);
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        // Mirror the account into the Convex directory so this person is
        // discoverable in search even before they open a conversation.
        if (u?.email) {
          convexChat
            .upsertUser({
              name: u.full_name || u.email,
              email: u.email,
              language: u.default_language || 'en',
              ...(u.avatar_url ? { avatarUrl: u.avatar_url } : {}),
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      });
  }, []);


  const logout = () => db.auth.logout('/landing');

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};