import { useCallback, useEffect, useState } from "react";

// ponytail: 배포 시 VITE_API_BASE에 Workers 프로덕션 URL 설정
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8787";

export type SignalLevel = "green" | "yellow" | "red" | "unknown";

export interface PointInfo {
  id: string;
  name: string;
  lat: number;
  lot: number;
}

export interface PointSummary {
  id: string;
  name: string;
  asOf: string; // KST HH:mm
  slot: "오전" | "오후";
  signal: { level: SignalLevel; reason: string };
  warning: string | null;
  warningUnavailable: boolean;
  tide: { highs: string[]; lows: string[]; mul: string; moon: string };
  now: {
    waveHeight: number | null;
    windDir: string;
    windSpeed: number | null;
    weather: string;
    airTemp: number | null;
    waterTemp: number | null;
  };
}

export interface TidePoint {
  time: string;
  level: number; // 조위 cm
}

export interface TideDay {
  date: string; // yyyy-MM-dd
  mul: string;
  moon: string;
  highs: TidePoint[];
  lows: TidePoint[];
}

interface TimelineSlot {
  time: string;
  temp: number | null;
  sky: string;
  pop: number | null;
  windSpeed: number | null;
  wave: number | null;
}

export interface PointDetail {
  id: string;
  name: string;
  nowTime: string; // "HH:mm" KST
  curve: TidePoint[]; // 24시간 조위 (60분 간격)
  highs: TidePoint[];
  lows: TidePoint[];
  timeline: TimelineSlot[];
}

// ── 오프라인 폴백: 마지막 성공 응답을 localStorage에 보관 ─────
const CACHE_PREFIX = "api-cache:";

function readCache<T>(path: string): { at: number; data: T } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + path);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(path: string, data: unknown) {
  try {
    localStorage.setItem(CACHE_PREFIX + path, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // 저장소 가득참 등 — 캐시는 보조 기능이라 무시
  }
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staleAt, setStaleAt] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setError(false);
    setLoading(true);
    fetch(`${API_BASE}${path}`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<T>;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setStaleAt(null);
        writeCache(path, json);
      })
      .catch(() => {
        if (cancelled) return;
        const cached = readCache<T>(path);
        if (cached) {
          setData(cached.data);
          setStaleAt(cached.at);
        } else {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, error, staleAt, loading, retry };
}
