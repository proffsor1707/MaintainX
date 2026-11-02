import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

const STORAGE_KEY = "maintainx-digital-wellbeing-v1";
const MAX_TICK_MS = 5_000;
const RETAIN_DAYS = 400;

type UsageRecord = {
  totalMs: number;
  dailyMs: Record<string, number>;
  firstTrackedAt: string | null;
};

type DigitalWellbeingValue = {
  todayMs: number;
  lastSevenDaysMs: number;
  totalMs: number;
  currentSessionMs: number;
  resetUsage: () => void;
};

const DigitalWellbeingContext = createContext<DigitalWellbeingValue | null>(null);

function localDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyUsage(): UsageRecord {
  return { totalMs: 0, dailyMs: {}, firstTrackedAt: null };
}

function readUsage(): UsageRecord {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyUsage();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyUsage();
    const value = parsed as Partial<UsageRecord>;
    if (typeof value.totalMs !== "number" || !value.dailyMs || typeof value.dailyMs !== "object") return emptyUsage();
    return {
      totalMs: Math.max(0, value.totalMs),
      dailyMs: Object.fromEntries(Object.entries(value.dailyMs).filter(([, ms]) => typeof ms === "number" && ms >= 0)),
      firstTrackedAt: typeof value.firstTrackedAt === "string" ? value.firstTrackedAt : null,
    };
  } catch {
    return emptyUsage();
  }
}

function addElapsed(record: UsageRecord, from: number, to: number): UsageRecord {
  if (to <= from) return record;
  const dailyMs = { ...record.dailyMs };
  let cursor = from;

  while (cursor < to) {
    const date = new Date(cursor);
    const nextLocalMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
    const segmentEnd = Math.min(to, nextLocalMidnight);
    const key = localDateKey(cursor);
    dailyMs[key] = (dailyMs[key] ?? 0) + (segmentEnd - cursor);
    cursor = segmentEnd;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETAIN_DAYS);
  const cutoffKey = localDateKey(cutoff.getTime());
  for (const key of Object.keys(dailyMs)) {
    if (key < cutoffKey) delete dailyMs[key];
  }

  return {
    totalMs: record.totalMs + to - from,
    dailyMs,
    firstTrackedAt: record.firstTrackedAt ?? new Date(from).toISOString(),
  };
}

function isPageActive(): boolean {
  return document.visibilityState === "visible" && document.hasFocus();
}

export function formatUsageDuration(milliseconds: number): string {
  const totalMinutes = Math.floor(Math.max(0, milliseconds) / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}

export function DigitalWellbeingProvider({ children }: PropsWithChildren) {
  const [usage, setUsage] = useState<UsageRecord>(readUsage);
  const [currentSessionMs, setCurrentSessionMs] = useState(0);
  const activeRef = useRef(isPageActive());
  const lastTickRef = useRef(Date.now());
  const sessionStartRef = useRef<number | null>(activeRef.current ? Date.now() : null);
  const usageRef = useRef(usage);
  usageRef.current = usage;

  useEffect(() => {
    const persist = (next: UsageRecord) => {
      usageRef.current = next;
      setUsage(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Keep the current session counter working if browser storage is unavailable.
      }
    };

    const tick = () => {
      const now = Date.now();
      if (activeRef.current) {
        const elapsed = Math.min(Math.max(0, now - lastTickRef.current), MAX_TICK_MS);
        if (elapsed > 0) persist(addElapsed(usageRef.current, now - elapsed, now));
        setCurrentSessionMs(sessionStartRef.current === null ? 0 : Math.max(0, now - sessionStartRef.current));
      }
      lastTickRef.current = now;
    };

    const updateActivity = () => {
      tick();
      const nowActive = isPageActive();
      activeRef.current = nowActive;
      lastTickRef.current = Date.now();
      sessionStartRef.current = nowActive ? lastTickRef.current : null;
      setCurrentSessionMs(0);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setUsage(readUsage());
    };

    const timer = window.setInterval(tick, 1_000);
    document.addEventListener("visibilitychange", updateActivity);
    window.addEventListener("focus", updateActivity);
    window.addEventListener("blur", updateActivity);
    window.addEventListener("pagehide", tick);
    window.addEventListener("storage", onStorage);

    return () => {
      tick();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateActivity);
      window.removeEventListener("focus", updateActivity);
      window.removeEventListener("blur", updateActivity);
      window.removeEventListener("pagehide", tick);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const resetUsage = useCallback(() => {
    const empty = emptyUsage();
    usageRef.current = empty;
    setUsage(empty);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The visible counter still resets for this session.
    }
    lastTickRef.current = Date.now();
    sessionStartRef.current = activeRef.current ? lastTickRef.current : null;
    setCurrentSessionMs(0);
  }, []);

  const value = useMemo(() => {
    const today = new Date();
    let lastSevenDaysMs = 0;
    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
      lastSevenDaysMs += usage.dailyMs[localDateKey(day.getTime())] ?? 0;
    }
    return {
      todayMs: usage.dailyMs[localDateKey(Date.now())] ?? 0,
      lastSevenDaysMs,
      totalMs: usage.totalMs,
      currentSessionMs,
      resetUsage,
    };
  }, [currentSessionMs, resetUsage, usage]);

  return <DigitalWellbeingContext.Provider value={value}>{children}</DigitalWellbeingContext.Provider>;
}

export function useDigitalWellbeing(): DigitalWellbeingValue {
  const value = useContext(DigitalWellbeingContext);
  if (!value) throw new Error("useDigitalWellbeing must be used inside DigitalWellbeingProvider");
  return value;
}
