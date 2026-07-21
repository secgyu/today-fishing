/** 순수 로직 모듈 — selfcheck.mts가 검증. I/O 없음. */

type SignalLevel = "green" | "yellow" | "red" | "unknown";
type RankedLevel = "green" | "yellow" | "red";

// ── 물때·월령 ──────────────────────────────────────────────

const SYNODIC = 29.530588853;
/** 기준 삭(신월): 2000-01-06 18:14 UTC */
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14);

/** 음력 일자 근사 (1~30). ponytail: 천문력 아닌 삭망월 나눗셈 근사 — 하루 오차 가능, 필요 시 한국천문연구원 음양력 API로 교체 */
function lunarDay(date: Date): number {
  const days = (date.getTime() - NEW_MOON_EPOCH) / 86400000;
  return Math.floor(days % SYNODIC) + 1;
}

/** 서해식 물때 (음력 1일 = 7물) */
const MUL_NAMES = [
  "7물",
  "8물",
  "9물",
  "10물",
  "11물",
  "12물",
  "13물",
  "조금",
  "무시",
  "1물",
  "2물",
  "3물",
  "4물",
  "5물",
  "6물",
];
/** 근사 물때 — 음양력 API 실패 시 폴백 */
export function mulName(date: Date): string {
  return MUL_NAMES[(lunarDay(date) - 1) % 15];
}

/** 정확 물때 — 한국천문연구원 음양력 API의 음력 일자로 계산 */
export function mulNameFromLunarDay(lunDay: number): string {
  return MUL_NAMES[(lunDay - 1) % 15];
}

const MOON_ICONS = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
export function moonIcon(date: Date): string {
  const phase = (((date.getTime() - NEW_MOON_EPOCH) / 86400000) % SYNODIC) / SYNODIC;
  return MOON_ICONS[Math.round(phase * 8) % 8];
}

// ── 업스트림 응답 파서 ──────────────────────────────────────

interface TideItem {
  predcDt: string; // "2026-07-18 07:32"
  predcTdlvVl: number;
  extrSe: string; // 1,3 = 고조 / 2,4 = 저조
}

interface TidePoint {
  time: string; // "07:32"
  level: number; // 조위 cm
}

export function parseTide(items: TideItem[]): { highs: TidePoint[]; lows: TidePoint[] } {
  const point = (i: TideItem): TidePoint => ({ time: i.predcDt.slice(11, 16), level: i.predcTdlvVl });
  const highs = items.filter((i) => i.extrSe === "1" || i.extrSe === "3").map(point);
  const lows = items.filter((i) => i.extrSe === "2" || i.extrSe === "4").map(point);
  return { highs, lows };
}

export interface FishingItem {
  seafsPstnNm: string;
  predcYmd: string;
  predcNoonSeCd: string; // 오전/오후
  seafsTgfshNm: string;
  totalIndex: string; // 매우좋음~매우나쁨
  minWvhgt: number;
  maxWvhgt: number;
  minWtem: number;
  maxWtem: number;
  minWspd: number;
  maxWspd: number;
}

/** 기타어종 행 우선(종합), 없으면 첫 행. 오전/오후 중 현재 시간대 우선. */
export function pickFishing(items: FishingItem[], date: string, isAfternoon: boolean): FishingItem | undefined {
  const today = items.filter((i) => i.predcYmd === date);
  const slot = today.filter((i) => i.predcNoonSeCd === (isAfternoon ? "오후" : "오전"));
  const pool = slot.length > 0 ? slot : today;
  return pool.find((i) => i.seafsTgfshNm === "기타어종") ?? pool[0];
}

interface ForecastSummary {
  hasData: boolean; // false면 빈 예보 — 풍속 0을 "잔잔"으로 오인하면 안 됨
  maxWindSpeed: number;
  maxWaveHeight: number;
  maxPop: number;
  sky: string;
  temp: number | null;
  windDir: string;
  windDeg: number | null;
}

interface ForecastItem {
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
}

const SKY_NAMES: Record<string, string> = { "1": "맑음", "3": "구름많음", "4": "흐림" };
const DIRS = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"];

export function summarizeForecast(items: ForecastItem[], date: string): ForecastSummary {
  const today = items.filter((i) => i.fcstDate === date);
  const num = (cat: string) =>
    today
      .filter((i) => i.category === cat)
      .map((i) => parseFloat(i.fcstValue))
      .filter((v) => !Number.isNaN(v));
  const max = (vals: number[]) => (vals.length > 0 ? Math.max(...vals) : 0);

  const first = (cat: string) => today.find((i) => i.category === cat)?.fcstValue;
  const vec = parseFloat(first("VEC") ?? "");
  const tmp = parseFloat(first("TMP") ?? "");

  return {
    hasData: today.length > 0,
    maxWindSpeed: max(num("WSD")),
    maxWaveHeight: max(num("WAV")),
    maxPop: max(num("POP")),
    sky: SKY_NAMES[first("SKY") ?? ""] ?? "-",
    temp: Number.isNaN(tmp) ? null : tmp,
    windDir: Number.isNaN(vec) ? "-" : DIRS[Math.round(vec / 45) % 8],
    windDeg: Number.isNaN(vec) ? null : vec,
  };
}

interface TimelineSlot {
  time: string; // "15:00"
  temp: number | null;
  sky: string;
  pop: number | null;
  windSpeed: number | null;
  wave: number | null;
}

/** 시간대별 예보 타임라인 — 현재 시각 이후 max개 슬롯 */
export function buildTimeline(items: ForecastItem[], nowKey: string, max = 12): TimelineSlot[] {
  const byKey = new Map<string, Record<string, string>>();
  for (const i of items) {
    const key = `${i.fcstDate}${i.fcstTime}`;
    if (key < nowKey) continue;
    const slot = byKey.get(key) ?? {};
    slot[i.category] = i.fcstValue;
    byKey.set(key, slot);
  }
  const num = (v: string | undefined) => {
    const n = parseFloat(v ?? "");
    return Number.isNaN(n) ? null : n;
  };
  return [...byKey.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, max)
    .map(([key, s]) => ({
      time: `${key.slice(8, 10)}:${key.slice(10, 12)}`,
      temp: num(s.TMP),
      sky: SKY_NAMES[s.SKY ?? ""] ?? "-",
      pop: num(s.POP),
      windSpeed: num(s.WSD),
      wave: num(s.WAV),
    }));
}

export interface WarningItem {
  areaName: string; // 특보구역명 (예: "서해중부앞바다")
  warnVar: number; // 1강풍 5폭풍해일 6풍랑 7태풍 (기상청 특보 종류 코드)
  warnStress: number; // 0주의보 1경보
}

const MARINE_WARN_NAMES: Record<number, string> = { 1: "강풍", 5: "폭풍해일", 6: "풍랑", 7: "태풍" };

/**
 * 특보 구역코드 현황(getPwnCd)에서 해당 해역의 해상 특보 찾기.
 * 구역명이 "서해중부앞바다"처럼 해역 키워드를 포함하는지로 판정. 경보 > 주의보 우선.
 */
export function findMarineWarning(items: WarningItem[], areaKeyword: string): string | null {
  let best: WarningItem | null = null;
  for (const i of items) {
    if (!MARINE_WARN_NAMES[i.warnVar] || !i.areaName.includes(areaKeyword)) continue;
    if (!best || i.warnStress > best.warnStress) best = i;
  }
  if (!best) return null;
  return `${MARINE_WARN_NAMES[best.warnVar]}${best.warnStress >= 1 ? "경보" : "주의보"} 발효 중`;
}

// ── 신호등 (기획서 §3 로직 v2) ──────────────────────────────

const INDEX_TO_LEVEL: Record<string, RankedLevel> = {
  매우좋음: "green",
  좋음: "green",
  보통: "yellow",
  나쁨: "red",
  매우나쁨: "red",
};

function demote(level: RankedLevel): RankedLevel {
  return level === "green" ? "yellow" : "red";
}

/**
 * 보정 임계값 — 공공 낚시지수는 갯바위/선상이 같은 날이 많아,
 * 신호등 보정으로만 연안(서서 낚시)·선상(배) 차이를 둔다.
 * 연안: 방파제·갯바위 기준 더 엄격 / 선상: 배 위에서 감당 가능한 수준
 */
const THRESHOLD = {
  갯바위: { wind: 9, wave: 1.0 },
  선상: { wind: 12, wave: 1.5 },
} as const;

export type FishingGubun = keyof typeof THRESHOLD;

export function computeSignal(input: {
  warning: string | null;
  /** true면 특보 API 실패 — "특보 없음"과 구분. 판단 불가 */
  warningUnavailable?: boolean;
  totalIndex: string | undefined;
  forecast: ForecastSummary;
  mul: string;
  gubun?: FishingGubun; // 기본 연안
}): { level: SignalLevel; reason: string } {
  const { warning, warningUnavailable, totalIndex, forecast, mul, gubun = "갯바위" } = input;
  const th = THRESHOLD[gubun];
  const mode = gubun === "선상" ? "선상" : "연안";

  if (warningUnavailable) {
    return { level: "unknown", reason: `판단 불가 · ${mode} · 기상특보를 확인하지 못했어요` };
  }
  if (warning) return { level: "red", reason: `출조 비추천 · ${mode} · ${warning}` };

  // 지수·예보 둘 다 없으면 Go/No-Go 배지 자체를 내리지 않음 (빈 예보의 0을 잔잔으로 오인 방지)
  if (!totalIndex && !forecast.hasData) {
    return { level: "unknown", reason: `판단 불가 · ${mode} · 지수·예보를 받지 못했어요` };
  }

  let level: RankedLevel = INDEX_TO_LEVEL[totalIndex ?? ""] ?? "yellow";
  const demotions: string[] = [];

  if (forecast.hasData && forecast.maxWindSpeed > th.wind) demotions.push(`풍속 ${forecast.maxWindSpeed}m/s`);
  if (forecast.hasData && forecast.maxWaveHeight > th.wave) demotions.push(`파고 ${forecast.maxWaveHeight}m`);
  if (forecast.hasData && forecast.maxPop > 60) demotions.push(`강수확률 ${forecast.maxPop}%`);
  if (demotions.length > 0) level = demote(level);

  const head = level === "green" ? "출조하기 좋아요" : level === "yellow" ? "주의" : "출조 비추천";
  const detail = demotions.length > 0 ? demotions[0] : totalIndex ? `낚시지수 ${totalIndex}` : "지수 정보 없음";
  return { level, reason: `${head} · ${mode} · ${mul} · ${detail}` };
}
