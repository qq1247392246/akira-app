"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: number;
  avatarUrl?: string | null;
  signature?: string | null;
};

type SessionContextValue = {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  loading: boolean;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);
const STORAGE_KEY = "akira_session";

export function SessionProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: SessionUser | null;
}) {
  const [user, setUserState] = useState<SessionUser | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SessionUser;
        setUserState(parsed);
      } else if (initialUser) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialUser));
      }
    } catch (error) {
      console.warn("读取本地 session 失败", error);
    } finally {
      setLoading(false);
    }
  }, [initialUser]);

  const setUser = useCallback((next: SessionUser | null) => {
    setUserState(next);
    if (typeof window === "undefined") return;
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo(() => ({ user, setUser, loading }), [user, setUser, loading]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession 必须在 SessionProvider 内部使用");
  }
  return context;
}

export type { SessionUser };

