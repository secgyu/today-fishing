var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/logic.ts
var SYNODIC = 29.530588853;
var NEW_MOON_EPOCH = Date.UTC(2e3, 0, 6, 18, 14);
function lunarDay(date) {
  const days = (date.getTime() - NEW_MOON_EPOCH) / 864e5;
  return Math.floor(days % SYNODIC) + 1;
}
__name(lunarDay, "lunarDay");
var MUL_NAMES = [
  "7\uBB3C",
  "8\uBB3C",
  "9\uBB3C",
  "10\uBB3C",
  "11\uBB3C",
  "12\uBB3C",
  "13\uBB3C",
  "\uC870\uAE08",
  "\uBB34\uC2DC",
  "1\uBB3C",
  "2\uBB3C",
  "3\uBB3C",
  "4\uBB3C",
  "5\uBB3C",
  "6\uBB3C"
];
function mulName(date) {
  return MUL_NAMES[(lunarDay(date) - 1) % 15];
}
__name(mulName, "mulName");
var MOON_ICONS = ["\u{1F311}", "\u{1F312}", "\u{1F313}", "\u{1F314}", "\u{1F315}", "\u{1F316}", "\u{1F317}", "\u{1F318}"];
function moonIcon(date) {
  const phase = (date.getTime() - NEW_MOON_EPOCH) / 864e5 % SYNODIC / SYNODIC;
  return MOON_ICONS[Math.round(phase * 8) % 8];
}
__name(moonIcon, "moonIcon");
function parseTide(items) {
  const point = /* @__PURE__ */ __name((i) => ({ time: i.predcDt.slice(11, 16), level: i.predcTdlvVl }), "point");
  const highs = items.filter((i) => i.extrSe === "1" || i.extrSe === "3").map(point);
  const lows = items.filter((i) => i.extrSe === "2" || i.extrSe === "4").map(point);
  return { highs, lows };
}
__name(parseTide, "parseTide");
function pickFishing(items, date, isAfternoon) {
  const today = items.filter((i) => i.predcYmd === date);
  const slot = today.filter((i) => i.predcNoonSeCd === (isAfternoon ? "\uC624\uD6C4" : "\uC624\uC804"));
  const pool = slot.length > 0 ? slot : today;
  return pool.find((i) => i.seafsTgfshNm === "\uAE30\uD0C0\uC5B4\uC885") ?? pool[0];
}
__name(pickFishing, "pickFishing");
var SKY_NAMES = { "1": "\uB9D1\uC74C", "3": "\uAD6C\uB984\uB9CE\uC74C", "4": "\uD750\uB9BC" };
var DIRS = ["\uBD81", "\uBD81\uB3D9", "\uB3D9", "\uB0A8\uB3D9", "\uB0A8", "\uB0A8\uC11C", "\uC11C", "\uBD81\uC11C"];
function summarizeForecast(items, date) {
  const today = items.filter((i) => i.fcstDate === date);
  const num = /* @__PURE__ */ __name((cat) => today.filter((i) => i.category === cat).map((i) => parseFloat(i.fcstValue)).filter((v) => !Number.isNaN(v)), "num");
  const max = /* @__PURE__ */ __name((vals) => vals.length > 0 ? Math.max(...vals) : 0, "max");
  const first = /* @__PURE__ */ __name((cat) => today.find((i) => i.category === cat)?.fcstValue, "first");
  const vec = parseFloat(first("VEC") ?? "");
  const tmp = parseFloat(first("TMP") ?? "");
  return {
    maxWindSpeed: max(num("WSD")),
    maxWaveHeight: max(num("WAV")),
    maxPop: max(num("POP")),
    sky: SKY_NAMES[first("SKY") ?? ""] ?? "-",
    temp: Number.isNaN(tmp) ? null : tmp,
    windDir: Number.isNaN(vec) ? "-" : DIRS[Math.round(vec / 45) % 8],
    windDeg: Number.isNaN(vec) ? null : vec
  };
}
__name(summarizeForecast, "summarizeForecast");
function buildTimeline(items, nowKey, max = 12) {
  const byKey = /* @__PURE__ */ new Map();
  for (const i of items) {
    const key = `${i.fcstDate}${i.fcstTime}`;
    if (key < nowKey) continue;
    const slot = byKey.get(key) ?? {};
    slot[i.category] = i.fcstValue;
    byKey.set(key, slot);
  }
  const num = /* @__PURE__ */ __name((v) => {
    const n = parseFloat(v ?? "");
    return Number.isNaN(n) ? null : n;
  }, "num");
  return [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, max).map(([key, s]) => ({
    time: `${key.slice(8, 10)}:${key.slice(10, 12)}`,
    temp: num(s.TMP),
    sky: SKY_NAMES[s.SKY ?? ""] ?? "-",
    pop: num(s.POP),
    windSpeed: num(s.WSD),
    wave: num(s.WAV)
  }));
}
__name(buildTimeline, "buildTimeline");
function findMarineWarning(t6, areaKeyword) {
  for (const line of t6.split("\n")) {
    const m = line.match(/(풍랑|강풍|태풍|폭풍해일)(경보|주의보)/);
    if (m && line.includes(areaKeyword)) return `${m[1]}${m[2]} \uBC1C\uD6A8 \uC911`;
  }
  return null;
}
__name(findMarineWarning, "findMarineWarning");
var INDEX_TO_LEVEL = {
  \uB9E4\uC6B0\uC88B\uC74C: "green",
  \uC88B\uC74C: "green",
  \uBCF4\uD1B5: "yellow",
  \uB098\uC068: "red",
  \uB9E4\uC6B0\uB098\uC068: "red"
};
function demote(level) {
  return level === "green" ? "yellow" : "red";
}
__name(demote, "demote");
function computeSignal(input) {
  const { warning, totalIndex, forecast, mul } = input;
  if (warning) return { level: "red", reason: `\uCD9C\uC870 \uBE44\uCD94\uCC9C \xB7 ${warning}` };
  let level = INDEX_TO_LEVEL[totalIndex ?? ""] ?? "yellow";
  const demotions = [];
  if (forecast.maxWindSpeed > 9) demotions.push(`\uD48D\uC18D ${forecast.maxWindSpeed}m/s`);
  if (forecast.maxWaveHeight > 1) demotions.push(`\uD30C\uACE0 ${forecast.maxWaveHeight}m`);
  if (forecast.maxPop > 60) demotions.push(`\uAC15\uC218\uD655\uB960 ${forecast.maxPop}%`);
  if (demotions.length > 0) level = demote(level);
  const head = level === "green" ? "\uCD9C\uC870\uD558\uAE30 \uC88B\uC544\uC694" : level === "yellow" ? "\uC8FC\uC758" : "\uCD9C\uC870 \uBE44\uCD94\uCC9C";
  const detail = demotions.length > 0 ? demotions[0] : totalIndex ? `\uB09A\uC2DC\uC9C0\uC218 ${totalIndex}` : "\uC9C0\uC218 \uC815\uBCF4 \uC5C6\uC74C";
  return { level, reason: `${head} \xB7 ${mul} \xB7 ${detail}` };
}
__name(computeSignal, "computeSignal");

// src/points.ts
var POINTS = [
  {
    id: "incheon",
    name: "\uC778\uCC9C",
    lat: 37.45194,
    lot: 126.59222,
    tideObsCode: "DT_0001",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 54,
    ny: 123,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "ansan",
    name: "\uC548\uC0B0 \uBC29\uC544\uBA38\uB9AC",
    lat: 37.28694,
    lot: 126.58306,
    tideObsCode: "DT_0008",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 57,
    ny: 121,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "gunsan",
    name: "\uAD70\uC0B0 \uBE44\uC751\uD56D",
    lat: 35.94028,
    lot: 126.52722,
    tideObsCode: "DT_0018",
    fishingPlaceName: "\uC2E0\uC2DC\uB3C4",
    nx: 56,
    ny: 80,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "busan",
    name: "\uBD80\uC0B0 \uD0DC\uC885\uB300",
    lat: 35.053,
    lot: 129.0873,
    tideObsCode: "DT_0005",
    // 부산 조위관측소
    // ponytail: 낚시지수 API에 부산 직접 지점 없음 — 최근접 유효 지점 거제도로 근사
    fishingPlaceName: "\uAC70\uC81C\uB3C4",
    nx: 98,
    // 영도구 격자
    ny: 74,
    warnKeyword: "\uB0A8\uD574\uB3D9\uBD80"
  }
];

// src/index.ts
var API = {
  tideCurve: "https://apis.data.go.kr/1192136/tideFcstTime/GetTideFcstTimeApiService",
  tide: "https://apis.data.go.kr/1192136/tideFcstHghLw/GetTideFcstHghLwApiService",
  fishing: "https://apis.data.go.kr/1192136/fcstFishingv2/GetFcstFishingApiServicev2",
  forecast: "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
  warning: "https://apis.data.go.kr/1360000/WthrWrnInfoService/getPwnStatus"
};
var TTL = { tide: 86400, fishing: 10800, forecast: 10800, warning: 600 };
var KST_OFFSET = 9 * 3600 * 1e3;
function kstNow() {
  return new Date(Date.now() + KST_OFFSET);
}
__name(kstNow, "kstNow");
function kstDate(offsetDays = 0) {
  const d = new Date(Date.now() + KST_OFFSET + offsetDays * 864e5);
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}
__name(kstDate, "kstDate");
function forecastBase() {
  const now = new Date(Date.now() + KST_OFFSET - 36e5);
  const hours = [23, 20, 17, 14, 11, 8, 5, 2];
  const h = hours.find((x) => x <= now.getUTCHours());
  if (h === void 0) {
    const y = new Date(now.getTime() - 864e5);
    return { date: y.toISOString().slice(0, 10).replaceAll("-", ""), time: "2300" };
  }
  return { date: now.toISOString().slice(0, 10).replaceAll("-", ""), time: `${String(h).padStart(2, "0")}00` };
}
__name(forecastBase, "forecastBase");
async function cachedFetch(url, ttl, ctx) {
  const cache = caches.default;
  const keyUrl = new URL(url);
  keyUrl.searchParams.delete("serviceKey");
  const cacheKey = new Request(keyUrl.toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`upstream ${res.status}: ${keyUrl.pathname}`);
  const body = await res.text();
  const cacheable = new Response(body, {
    headers: { "Content-Type": "application/json", "Cache-Control": `s-maxage=${ttl}` }
  });
  ctx.waitUntil(cache.put(cacheKey, cacheable));
  return JSON.parse(body);
}
__name(cachedFetch, "cachedFetch");
function qs(params) {
  return new URLSearchParams(params).toString();
}
__name(qs, "qs");
async function fetchTide(point, date, env, ctx) {
  const url = `${API.tide}?${qs({ serviceKey: env.DATA_GO_KR_SERVICE_KEY, type: "json", obsCode: point.tideObsCode, reqDate: date, numOfRows: "10" })}`;
  const json2 = await cachedFetch(url, TTL.tide, ctx);
  return parseTide(json2?.body?.items?.item ?? []);
}
__name(fetchTide, "fetchTide");
async function fetchTideCurve(point, date, env, ctx) {
  const url = `${API.tideCurve}?${qs({ serviceKey: env.DATA_GO_KR_SERVICE_KEY, type: "json", obsCode: point.tideObsCode, reqDate: date, min: "60", numOfRows: "30" })}`;
  const json2 = await cachedFetch(url, TTL.tide, ctx);
  const items = json2?.body?.items?.item ?? [];
  return items.map((i) => ({ time: String(i.predcDt).slice(11, 16), level: Number(i.tdlvHgt) }));
}
__name(fetchTideCurve, "fetchTideCurve");
async function fetchFishing(point, env, ctx) {
  const url = `${API.fishing}?${qs({ serviceKey: env.DATA_GO_KR_SERVICE_KEY, type: "json", gubun: "\uAC2F\uBC14\uC704", placeName: point.fishingPlaceName, numOfRows: "50" })}`;
  const json2 = await cachedFetch(url, TTL.fishing, ctx);
  return json2?.body?.items?.item ?? [];
}
__name(fetchFishing, "fetchFishing");
async function fetchForecast(point, env, ctx) {
  const base = forecastBase();
  const url = `${API.forecast}?${qs({ serviceKey: env.DATA_GO_KR_SERVICE_KEY, dataType: "JSON", pageNo: "1", numOfRows: "300", base_date: base.date, base_time: base.time, nx: String(point.nx), ny: String(point.ny) })}`;
  const json2 = await cachedFetch(url, TTL.forecast, ctx);
  return json2?.response?.body?.items?.item ?? [];
}
__name(fetchForecast, "fetchForecast");
async function fetchWarningText(env, ctx) {
  const url = `${API.warning}?${qs({ serviceKey: env.DATA_GO_KR_SERVICE_KEY, dataType: "JSON", pageNo: "1", numOfRows: "10", stnId: "108" })}`;
  const json2 = await cachedFetch(url, TTL.warning, ctx);
  const items = json2?.response?.body?.items?.item ?? [];
  return items.map((i) => `${i.t6 ?? ""}
${i.t7 ?? ""}`).join("\n");
}
__name(fetchWarningText, "fetchWarningText");
async function homeSummary(point, env, ctx) {
  const now = kstNow();
  const today = kstDate();
  const todayDashed = `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`;
  const [tide, fishingItems, forecastItems, warningText] = await Promise.all([
    fetchTide(point, today, env, ctx),
    fetchFishing(point, env, ctx),
    fetchForecast(point, env, ctx),
    fetchWarningText(env, ctx)
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
    warning: warning ? `${warning} \xB7 ${point.warnKeyword}` : null,
    tide: {
      highs: tide.highs.map((t) => t.time),
      lows: tide.lows.map((t) => t.time),
      mul,
      moon: moonIcon(now)
    },
    now: {
      waveHeight: fishing?.maxWvhgt ?? forecast.maxWaveHeight,
      windDir: forecast.windDir,
      windSpeed: fishing?.maxWspd ?? forecast.maxWindSpeed,
      weather: forecast.sky,
      airTemp: forecast.temp,
      waterTemp: fishing?.maxWtem ?? null
    }
  };
}
__name(homeSummary, "homeSummary");
async function pointDetail(point, env, ctx) {
  const now = kstNow();
  const today = kstDate();
  const nowKey = `${today}${String(now.getUTCHours()).padStart(2, "0")}00`;
  const [curve, tide, forecastItems] = await Promise.all([
    fetchTideCurve(point, today, env, ctx),
    fetchTide(point, today, env, ctx),
    fetchForecast(point, env, ctx)
  ]);
  return {
    id: point.id,
    name: point.name,
    nowTime: `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`,
    curve,
    highs: tide.highs,
    lows: tide.lows,
    timeline: buildTimeline(forecastItems, nowKey)
  };
}
__name(pointDetail, "pointDetail");
async function mapPins(env, ctx) {
  const now = kstNow();
  const today = kstDate();
  const todayDashed = `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`;
  const warningText = await fetchWarningText(env, ctx);
  return Promise.all(
    POINTS.map(async (point) => {
      const [fishingItems, forecastItems] = await Promise.all([
        fetchFishing(point, env, ctx),
        fetchForecast(point, env, ctx)
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
        windSpeed: fishing?.maxWspd ?? forecast.maxWindSpeed
      };
    })
  );
}
__name(mapPins, "mapPins");
async function tideWeek(point, days, env, ctx) {
  return Promise.all(
    Array.from({ length: days }, async (_, i) => {
      const date = kstDate(i);
      const d = new Date(Date.now() + KST_OFFSET + i * 864e5);
      const tide = await fetchTide(point, date, env, ctx);
      return {
        date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
        mul: mulName(d),
        moon: moonIcon(d),
        ...tide
      };
    })
  );
}
__name(tideWeek, "tideWeek");
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}
__name(json, "json");
var src_default = {
  async fetch(request, env, ctx) {
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
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-ODQzni/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-ODQzni/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
