/** 순수 로직 모듈 — selfcheck.mjs가 검증. I/O 없음. */

export type SignalLevel = "green" | "yellow" | "red";

// ── 물때·월령 ──────────────────────────────────────────────

const SYNODIC = 29.530588853;
/** 기준 삭(신월): 2000-01-06 18:14 UTC */
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14);

/** 음력 일자 근사 (1~30). ponytail: 천문력 아닌 삭망월 나눗셈 근사 — 하루 오차 가능, 필요 시 한국천문연구원 음양력 API로 교체 */
export function lunarDay(date: Date): number {
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
export function mulName(date: Date): string {
  return MUL_NAMES[(lunarDay(date) - 1) % 15];
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

export interface TidePoint {
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

export interface ForecastSummary {
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
    maxWindSpeed: max(num("WSD")),
    maxWaveHeight: max(num("WAV")),
    maxPop: max(num("POP")),
    sky: SKY_NAMES[first("SKY") ?? ""] ?? "-",
    temp: Number.isNaN(tmp) ? null : tmp,
    windDir: Number.isNaN(vec) ? "-" : DIRS[Math.round(vec / 45) % 8],
    windDeg: Number.isNaN(vec) ? null : vec,
  };
}

export interface TimelineSlot {
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

/**
 * 특보현황 통보문(t6)에서 해당 해역의 해상 특보 찾기.
 * ponytail: 키워드 텍스트 매칭 — 특보구역코드 매핑으로 업그레이드 예정
 */
export function findMarineWarning(t6: string, areaKeyword: string): string | null {
  for (const line of t6.split("\n")) {
    const m = line.match(/(풍랑|강풍|태풍|폭풍해일)(경보|주의보)/);
    if (m && line.includes(areaKeyword)) return `${m[1]}${m[2]} 발효 중`;
  }
  return null;
}

// ── 신호등 (기획서 §3 로직 v2) ──────────────────────────────

const INDEX_TO_LEVEL: Record<string, SignalLevel> = {
  매우좋음: "green",
  좋음: "green",
  보통: "yellow",
  나쁨: "red",
  매우나쁨: "red",
};

function demote(level: SignalLevel): SignalLevel {
  return level === "green" ? "yellow" : "red";
}

export function computeSignal(input: {
  warning: string | null;
  totalIndex: string | undefined;
  forecast: ForecastSummary;
  mul: string;
}): { level: SignalLevel; reason: string } {
  const { warning, totalIndex, forecast, mul } = input;

  if (warning) return { level: "red", reason: `출조 비추천 · ${warning}` };

  let level = INDEX_TO_LEVEL[totalIndex ?? ""] ?? "yellow";
  const demotions: string[] = [];

  if (forecast.maxWindSpeed > 9) demotions.push(`풍속 ${forecast.maxWindSpeed}m/s`);
  if (forecast.maxWaveHeight > 1.0) demotions.push(`파고 ${forecast.maxWaveHeight}m`);
  if (forecast.maxPop > 60) demotions.push(`강수확률 ${forecast.maxPop}%`);
  if (demotions.length > 0) level = demote(level);

  const head = level === "green" ? "출조하기 좋아요" : level === "yellow" ? "주의" : "출조 비추천";
  const detail = demotions.length > 0 ? demotions[0] : totalIndex ? `낚시지수 ${totalIndex}` : "지수 정보 없음";
  return { level, reason: `${head} · ${mul} · ${detail}` };
}
