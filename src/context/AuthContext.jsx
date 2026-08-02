/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return undefined;

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => {
    const requestAccount = async (action, values) => {
      try {
        const response = await fetch('/api/account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...values }),
        });
        const data = await response.json();
        if (!response.ok) return { data: null, error: { message: data.error, status: response.status } };
        const { error } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (error) return { data: null, error };
        return { data, error: null };
      } catch {
        return { data: null, error: { message: 'The account service could not be reached.' } };
      }
    };

    return {
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      signIn: (username, password) => requestAccount('signin', { username, password }),
      signUp: (username, password) => requestAccount('signup', { username, password }),
      recoverAccount: (username, recoveryCode, newPassword) => requestAccount('recover', { username, recoveryCode, newPassword }),
      signOut: () => supabase.auth.signOut(),
    };
  }, [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
