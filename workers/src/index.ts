import {
  buildTimeline,
  computeSignal,
  findMarineWarning,
  moonIcon,
  mulName,
  parseTide,
  pickFishing,
  summarizeForecast,
  type FishingItem,
} from "./logic";
import { POINTS, type Point } from "./points";

const API = {
  tideCurve: "https://apis.data.go.kr/1192136/tideFcstTime/GetTideFcstTimeApiService",
  tide: "https://apis.data.go.kr/1192136/tideFcstHghLw/GetTideFcstHghLwApiService",
  fishing: "https://apis.data.go.kr/1192136/fcstFishingv2/GetFcstFishingApiServicev2",
  forecast: "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
  warning: "https://apis.data.go.kr/1360000/WthrWrnInfoService/getPwnStatus",
};

// 캐시 TTL (기획서 §6): 조석 24h, 지수·예보 3h, 특보 10min
const TTL = { tide: 86400, fishing: 10800, forecast: 10800, warning: 600 } as const;

const KST_OFFSET = 9 * 3600 * 1000;
function kstNow(): Date {
  return new Date(Date.now() + KST_OFFSET);
}
/** KST 기준 yyyyMMdd (d일 뒤) */
function kstDate(offsetDays = 0): string {
  const d = new Date(Date.now() + KST_OFFSET + offsetDays * 86400000);
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}

/** 단기예보 발표시각: 02시부터 3시간 간격, 데이터 반영 지연 고려해 1시간 여유 */
function forecastBase(): { date: string; time: string } {
  const now = new Date(Date.now() + KST_OFFSET - 3600000);
  const hours = [23, 20, 17, 14, 11, 8, 5, 2];
  const h = hours.find((x) => x <= now.getUTCHours());
  if (h === undefined) {
    const y = new Date(now.getTime() - 86400000);
    return { date: y.toISOString().slice(0, 10).replaceAll("-", ""), time: "2300" };
  }
  return { date: now.toISOString().slice(0, 10).replaceAll("-", ""), time: `${String(h).padStart(2, "0")}00` };
}

/** 업스트림 호출 + Cache API 캐싱 */
async function cachedFetch(url: string, ttl: number, ctx: ExecutionContext): Promise<unknown> {
  const cache = caches.default;
  // 캐시 키에서 serviceKey 제거 (키 로테이션 시 캐시 무효화 방지 + 로그 위생)
  const keyUrl = new URL(url);
  keyUrl.searchParams.delete("serviceKey");
  const cacheKey = new Request(keyUrl.toString());

  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();

  const res = await fetch(url);
  if (!res.ok) throw new Error(`upstream ${res.status}: ${keyUrl.pathname}`);
  const body = await res.text();

  const cacheable = new Response(body, {
    headers: { "Content-Type": "application/json", "Cache-Control": `s-maxage=${ttl}` },
  });
  ctx.waitUntil(cache.put(cacheKey, cacheable));
  return JSON.parse(body);
}

function qs(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any; // 업스트림 응답 — 파서에서 형태 검증

async function fetchTide(point: Point, date: string, env: Env, ctx: ExecutionContext) {
  const url = `${API.tide}?${qs({ serviceKey: env.DATA_GO_KR_SERVICE_KEY, type: "json", obsCode: point.tideObsCode, reqDate: date, numOfRows: "10" })}`;
  const json = (await cachedFetch(url, TTL.tide, ctx)) as Json;
  return parseTide(json?.body?.items?.item ?? []);
}

/** 24시간 조위 곡선 (60분 간격) */
async function fetchTideCurve(point: Point, date: string, env: Env, ctx: ExecutionContext) {
  const url = `${API.tideCurve}?${qs({ serviceKey: env.DATA_GO_KR_SERVICE_KEY, type: "json", obsCode: point.tideObsCode, reqDate: date, min: "60", numOfRows: "30" })}`;
  const json = (await cachedFetch(url, TTL.tide, ctx)) as Json;
  const items = json?.body?.items?.item ?? [];
  return items.map((i: Json) => ({ time: String(i.predcDt).slice(11, 16), level: Number(i.tdlvHgt) }));
}

async function fetchFishing(point: Point, env: Env, ctx: ExecutionContext): Promise<FishingItem[]> {
  const url = `${API.fishing}?${qs({ serviceKey: env.DATA_GO_KR_SERVICE_KEY, type: "json", gubun: "갯바위", placeName: point.fishingPlaceName, numOfRows: "50" })}`;
  const json = (await cachedFetch(url, TTL.fishing, ctx)) as Json;
  return json?.body?.items?.item ?? [];
}

async function fetchForecast(point: Point, env: Env, ctx: ExecutionContext) {
  const base = forecastBase();
  const url = `${API.forecast}?${qs({ serviceKey: env.DATA_GO_KR_SERVICE_KEY, dataType: "JSON", pageNo: "1", numOfRows: "300", base_date: base.date, base_time: base.time, nx: String(point.nx), ny: String(point.ny) })}`;
  const json = (await cachedFetch(url, TTL.forecast, ctx)) as Json;
  return json?.response?.body?.items?.item ?? [];
}

async function fetchWarningText(env: Env, ctx: ExecutionContext): Promise<string> {
  // stnId 108 = 전국
  const url = `${API.warning}?${qs({ serviceKey: env.DATA_GO_KR_SERVICE_KEY, dataType: "JSON", pageNo: "1", numOfRows: "10", stnId: "108" })}`;
  const json = (await cachedFetch(url, TTL.warning, ctx)) as Json;
  const items = json?.response?.body?.items?.item ?? [];
  return items.map((i: Json) => `${i.t6 ?? ""}\n${i.t7 ?? ""}`).join("\n");
}

// ── 응답 조립 ──────────────────────────────────────────────

async function homeSummary(point: Point, env: Env, ctx: ExecutionContext) {
  const now = kstNow();
  const today = kstDate();
  const todayDashed = `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`;

  const [tide, fishingItems, forecastItems, warningText] = await Promise.all([
    fetchTide(point, today, env, ctx),
    fetchFishing(point, env, ctx),
    fetchForecast(point, env, ctx),
    fetchWarningText(env, ctx),
  ]);

  const fishing = pickFishing(fishingItems, todayDashed, now.getUTCHours() >= 12);
  const forecast = summarizeForecast(forecastItems, today);
  const warning = findMarineWarning(warningText, point.warnKeyword);
  const mul = mulName(now);
  const signal = computeSignal({ warning, totalIndex: fishing?.totalIndex, forecast, mul });

  return {
    id: point.id,
    name: point.name,
    signal,
    warning: warning ? `${warning} · ${point.warnKeyword}` : null,
    tide: {
      highs: tide.highs.map((t) => t.time),
      lows: tide.lows.map((t) => t.time),
      mul,
      moon: moonIcon(now),
    },
    now: {
      waveHeight: fishing?.maxWvhgt ?? forecast.maxWaveHeight,
      windDir: forecast.windDir,
      windSpeed: fishing?.maxWspd ?? forecast.maxWindSpeed,
      weather: forecast.sky,
      airTemp: forecast.temp,
      waterTemp: fishing?.maxWtem ?? null,
    },
  };
}

/** 포인트 상세 — 24시간 조위 곡선 + 만간조 + 시간대별 예보 */
async function pointDetail(point: Point, env: Env, ctx: ExecutionContext) {
  const now = kstNow();
  const today = kstDate();
  const nowKey = `${today}${String(now.getUTCHours()).padStart(2, "0")}00`;

  const [curve, tide, forecastItems] = await Promise.all([
    fetchTideCurve(point, today, env, ctx),
    fetchTide(point, today, env, ctx),
    fetchForecast(point, env, ctx),
  ]);

  return {
    id: point.id,
    name: point.name,
    nowTime: `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`,
    curve,
    highs: tide.highs,
    lows: tide.lows,
    timeline: buildTimeline(forecastItems, nowKey),
  };
}

/** 지도 핀용 요약 — 조석 없이 신호등·바람만 (전 포인트 병렬) */
async function mapPins(env: Env, ctx: ExecutionContext) {
  const now = kstNow();
  const today = kstDate();
  const todayDashed = `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`;
  const warningText = await fetchWarningText(env, ctx);

  return Promise.all(
    POINTS.map(async (point) => {
      const [fishingItems, forecastItems] = await Promise.all([
        fetchFishing(point, env, ctx),
        fetchForecast(point, env, ctx),
      ]);
      const fishing = pickFishing(fishingItems, todayDashed, now.getUTCHours() >= 12);
      const forecast = summarizeForecast(forecastItems, today);
      const warning = findMarineWarning(warningText, point.warnKeyword);
      const signal = computeSignal({ warning, totalIndex: fishing?.totalIndex, forecast, mul: mulName(now) });

      return {
        id: point.id,
        name: point.name,
        lat: point.lat,
        lot: point.lot,
        signal,
        windDir: forecast.windDir,
        windDeg: forecast.windDeg,
        windSpeed: fishing?.maxWspd ?? forecast.maxWindSpeed,
      };
    }),
  );
}

async function tideWeek(point: Point, days: number, env: Env, ctx: ExecutionContext) {
  return Promise.all(
    Array.from({ length: days }, async (_, i) => {
      const date = kstDate(i);
      const d = new Date(Date.now() + KST_OFFSET + i * 86400000);
      const tide = await fetchTide(point, date, env, ctx);
      return {
        date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
        mul: mulName(d),
        moon: moonIcon(d),
        ...tide,
      };
    }),
  );
}

// ── 라우팅 ─────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const [, api, resource, pointId] = url.pathname.split("/");
    if (api !== "api") return json({ error: "not found" }, 404);

    try {
      if (resource === "points") {
        return json(POINTS.map(({ id, name, lat, lot }) => ({ id, name, lat, lot })));
      }
      if (resource === "map") {
        return json(await mapPins(env, ctx));
      }

      const point = POINTS.find((p) => p.id === pointId);
      if (!point) return json({ error: `unknown point: ${pointId}` }, 404);

      if (resource === "home") return json(await homeSummary(point, env, ctx));
      if (resource === "detail") return json(await pointDetail(point, env, ctx));
      if (resource === "tide") {
        const days = Math.min(Math.max(parseInt(url.searchParams.get("days") ?? "7", 10) || 7, 1), 28);
        return json(await tideWeek(point, days, env, ctx));
      }

      return json({ error: "not found" }, 404);
    } catch (e) {
      console.error(JSON.stringify({ error: String(e), path: url.pathname }));
      return json({ error: "upstream failure" }, 502);
    }
  },
} satisfies ExportedHandler<Env>;
