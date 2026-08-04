"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
}

interface AppContextType {
  isSetup: boolean;
  isUnlocked: boolean;
  autoLockSeconds: number;
  loading: boolean;
  user: UserAccount | null;
  users: UserAccount[];
  unlock: () => void;
  lock: () => void;
  logout: () => Promise<void>;
  setSetup: (v: boolean) => void;
  setAutoLockSeconds: (v: number) => void;
  refreshAuth: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({
  isSetup: false,
  isUnlocked: false,
  autoLockSeconds: 60,
  loading: true,
  user: null,
  users: [],
  unlock: () => {},
  lock: () => {},
  logout: async () => {},
  setSetup: () => {},
  setAutoLockSeconds: () => {},
  refreshAuth: async () => {},
});

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isSetup, setIsSetup] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [autoLockSeconds, setAutoLockSecondsState] = useState(60);
  const [user, setUser] = useState<UserAccount | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef(0);
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      setIsSetup(data.isSetup);
      setIsUnlocked(data.isUnlocked);
      setAutoLockSecondsState(data.autoLockSeconds || 60);
      setUser(data.user || null);
      setUsers(data.user ? [data.user] : []);
    } catch {
      // network error — remain locked
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    void refreshAuth();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, [refreshAuth]);

  // Auto-lock via visibility API
  useEffect(() => {
    if (!isUnlocked) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastActivityRef.current = Date.now();
      } else {
        const elapsed = (Date.now() - lastActivityRef.current) / 1000;
        if (elapsed > autoLockSeconds) {
          fetch("/api/auth/lock", { method: "POST" }).then(() => {
            setIsUnlocked(false);
          });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isUnlocked, autoLockSeconds]);

  // Periodic activity check for auto-lock
  useEffect(() => {
    if (!isUnlocked) {
      if (lockTimerRef.current) clearInterval(lockTimerRef.current);
      return;
    }

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener("click", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("touchstart", updateActivity);
    window.addEventListener("scroll", updateActivity);

    lockTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - lastActivityRef.current) / 1000;
      if (elapsed > autoLockSeconds) {
        fetch("/api/auth/lock", { method: "POST" }).then(() => {
          setIsUnlocked(false);
        });
      }
    }, 5000);

    return () => {
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    };
  }, [isUnlocked, autoLockSeconds]);

  const unlock = useCallback(() => {
    setIsUnlocked(true);
    lastActivityRef.current = Date.now();
    refreshAuth();
  }, [refreshAuth]);

  const lock = useCallback(() => {
    fetch("/api/auth/lock", { method: "POST" });
    setIsUnlocked(false);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsUnlocked(false);
    setUser(null);
    refreshAuth();
  }, [refreshAuth]);

  const setSetup = useCallback((v: boolean) => setIsSetup(v), []);
  const setAutoLockSeconds = useCallback((v: number) => setAutoLockSecondsState(v), []);

  return (
    <AppContext.Provider
      value={{
        isSetup,
        isUnlocked,
        autoLockSeconds,
        loading,
        user,
        users,
        unlock,
        lock,
        logout,
        setSetup,
        setAutoLockSeconds,
        refreshAuth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
