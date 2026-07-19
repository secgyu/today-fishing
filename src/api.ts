import { useCallback, useEffect, useState } from "react";

// ponytail: 배포 시 VITE_API_BASE에 Workers 프로덕션 URL 설정
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8787";

export type SignalLevel = "green" | "yellow" | "red";

export interface PointInfo {
  id: string;
  name: string;
  lat: number;
  lot: number;
}

export interface PointSummary {
  id: string;
  name: string;
  signal: { level: SignalLevel; reason: string };
  warning: string | null;
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

export interface TimelineSlot {
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

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!path) return;
    let stale = false;
    setError(false);
    fetch(`${API_BASE}${path}`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<T>;
      })
      .then((json) => {
        if (!stale) setData(json);
      })
      .catch(() => {
        if (!stale) setError(true);
      });
    return () => {
      stale = true;
    };
  }, [path, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, error, retry };
}
