import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './context.js';
import {
  getCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
} from '../api/auth.js';

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ status: 'loading', user: null });

  useEffect(() => {
    const controller = new AbortController();

    getCurrentUser({ signal: controller.signal })
      .then((user) => {
        setSession({ status: 'authenticated', user });
      })
      .catch((error) => {
        if (error?.name === 'AbortError') {
          return;
        }

        setSession({ status: 'guest', user: null });
      });

    return () => controller.abort();
  }, []);

  const login = useCallback(async (credentials) => {
    const user = await loginAccount(credentials);
    setSession({ status: 'authenticated', user });
    return user;
  }, []);

  const register = useCallback(async (details) => {
    const user = await registerAccount(details);
    setSession({ status: 'authenticated', user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    await logoutAccount();
  }, []);

  const refreshMe = useCallback(async () => {
    const user = await getCurrentUser();
    setSession({ status: 'authenticated', user });
    return user;
  }, []);

  const value = useMemo(
    () => ({
      ...session,
      isAuthenticated: session.status === 'authenticated',
      login,
      register,
      logout,
      refreshMe,
    }),
    [session, login, register, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
