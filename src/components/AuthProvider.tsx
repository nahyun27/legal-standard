'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, type User } from '@/lib/api';

interface AuthState {
  user: User | null;
  /** 첫 /auth/me 확인이 끝났는지. 끝나기 전엔 로그인 여부로 화면을 분기하지 않는다(깜빡임 방지). */
  ready: boolean;
  /** 백엔드에 연결하지 못했는지 — 로그인 화면에서 안내한다. */
  offline: boolean;
  reload: () => Promise<User | null>;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  const reload = useCallback(async () => {
    try {
      // 비로그인도 200 {user: null} — 401 없이 확인하고, access 가 만료됐으면 서버가 그 자리에서 재발급한다
      const { user: me } = await api<{ user: User | null }>('/auth/session', {}, false);
      setUser(me);
      setOffline(false);
      return me;
    } catch {
      setUser(null);
      setOffline(true);
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return (
    <AuthContext.Provider value={{ user, ready, offline, reload, setUser, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
