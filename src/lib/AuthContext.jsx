import { db } from '@/lib/db';
import { convexChat } from '@/lib/convexChat';
import { supabase } from '@/integrations/supabase/client';

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext();

function isNetworkError(err) {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('fetch failed') ||
    msg.includes('timed out') ||
    msg.includes('timeout')
  );
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const mirrorToDirectory = useCallback((u) => {
    if (!u?.email) return;
    convexChat
      .upsertUser({
        name: u.full_name || u.email,
        email: u.email,
        ...(u.language_set && u.default_language ? { language: u.default_language } : {}),
        ...(u.avatar_url ? { avatarUrl: u.avatar_url } : {}),
      })
      .catch(() => {});
  }, []);

  /**
   * Resolve the signed-in account. The session may not be readable on the very
   * first attempt (the preview auth broker and the OAuth redirect both restore
   * it asynchronously), so wait for a session before declaring the visitor a
   * guest. Without this a freshly authenticated user is bounced back to the
   * landing page.
   */
  const resolve = useCallback(async () => {
    setAuthError(null);
    try {
      let session = null;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        session = data?.session || null;
        if (session) break;
        await new Promise((r) => setTimeout(r, 250));
      }

      if (!session) {
        if (!mounted.current) return;
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      const u = await db.auth.me();
      if (!mounted.current) return;
      setUser(u);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      mirrorToDirectory(u);
    } catch (err) {
      if (!mounted.current) return;
      if (isNetworkError(err)) {
        setAuthError({
          type: 'network',
          message: "We couldn't reach Preter. Check your connection and try again.",
        });
      }
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
    }
  }, [mirrorToDirectory]);

  useEffect(() => {
    resolve();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setIsLoadingAuth(true);
        resolve();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    });

    return () => sub?.subscription?.unsubscribe?.();
  }, [resolve]);

  const retryAuth = useCallback(() => {
    setIsLoadingAuth(true);
    resolve();
  }, [resolve]);

  const logout = () => db.auth.logout('/landing');

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      retryAuth,
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
