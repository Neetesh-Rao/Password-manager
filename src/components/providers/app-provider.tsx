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

interface AppContextType {
  isSetup: boolean;
  isUnlocked: boolean;
  autoLockSeconds: number;
  loading: boolean;
  unlock: () => void;
  lock: () => void;
  setSetup: (v: boolean) => void;
  setAutoLockSeconds: (v: number) => void;
  refreshAuth: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({
  isSetup: false,
  isUnlocked: false,
  autoLockSeconds: 60,
  loading: true,
  unlock: () => {},
  lock: () => {},
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
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef(Date.now());
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      setIsSetup(data.isSetup);
      setIsUnlocked(data.isUnlocked);
      setAutoLockSecondsState(data.autoLockSeconds || 60);
    } catch {
      // network error — remain locked
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
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

    // Track user activity
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
  }, []);

  const lock = useCallback(() => {
    fetch("/api/auth/lock", { method: "POST" });
    setIsUnlocked(false);
  }, []);

  const setSetup = useCallback((v: boolean) => setIsSetup(v), []);
  const setAutoLockSeconds = useCallback((v: number) => setAutoLockSecondsState(v), []);

  return (
    <AppContext.Provider
      value={{
        isSetup,
        isUnlocked,
        autoLockSeconds,
        loading,
        unlock,
        lock,
        setSetup,
        setAutoLockSeconds,
        refreshAuth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
