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

// src/points.gen.json
var points_gen_default = [
  {
    id: "incheon",
    name: "\uC778\uCC9C",
    lat: 37.45194,
    lot: 126.59222,
    tideObsCode: "DT_0001",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 53,
    ny: 124,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0002",
    name: "\uD3C9\uD0DD",
    lat: 36.96694,
    lot: 126.82277,
    tideObsCode: "DT_0002",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 57,
    ny: 114,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0003",
    name: "\uC601\uAD11",
    lat: 35.42611,
    lot: 126.42055,
    tideObsCode: "DT_0003",
    fishingPlaceName: "\uC2E0\uC2DC\uB3C4",
    nx: 50,
    ny: 80,
    warnKeyword: "\uC11C\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0004",
    name: "\uC81C\uC8FC",
    lat: 33.5275,
    lot: 126.54305,
    tideObsCode: "DT_0004",
    fishingPlaceName: "\uCD94\uC790\uB3C4",
    nx: 53,
    ny: 39,
    warnKeyword: "\uC81C\uC8FC\uB3C4"
  },
  {
    id: "busan",
    name: "\uBD80\uC0B0",
    lat: 35.09638,
    lot: 129.03527,
    tideObsCode: "DT_0005",
    fishingPlaceName: "\uAC70\uC81C\uB3C4",
    nx: 97,
    ny: 74,
    warnKeyword: "\uB0A8\uD574\uB3D9\uBD80"
  },
  {
    id: "dt_0006",
    name: "\uBB35\uD638",
    lat: 37.55027,
    lot: 129.11638,
    tideObsCode: "DT_0006",
    fishingPlaceName: "\uD6C4\uD3EC",
    nx: 97,
    ny: 127,
    warnKeyword: "\uB3D9\uD574\uC911\uBD80"
  },
  {
    id: "dt_0007",
    name: "\uBAA9\uD3EC",
    lat: 34.77972,
    lot: 126.37555,
    tideObsCode: "DT_0007",
    fishingPlaceName: "\uCD94\uC790\uB3C4",
    nx: 50,
    ny: 66,
    warnKeyword: "\uC11C\uD574\uB0A8\uBD80"
  },
  {
    id: "ansan",
    name: "\uC548\uC0B0",
    lat: 37.19222,
    lot: 126.64722,
    tideObsCode: "DT_0008",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 54,
    ny: 119,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0010",
    name: "\uC11C\uADC0\uD3EC",
    lat: 33.24,
    lot: 126.56166,
    tideObsCode: "DT_0010",
    fishingPlaceName: "\uCD94\uC790\uB3C4",
    nx: 53,
    ny: 32,
    warnKeyword: "\uC81C\uC8FC\uB3C4"
  },
  {
    id: "dt_0011",
    name: "\uD6C4\uD3EC",
    lat: 36.6775,
    lot: 129.45305,
    tideObsCode: "DT_0011",
    fishingPlaceName: "\uD6C4\uD3EC",
    nx: 103,
    ny: 109,
    warnKeyword: "\uB3D9\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0012",
    name: "\uC18D\uCD08",
    lat: 38.20722,
    lot: 128.59416,
    tideObsCode: "DT_0012",
    fishingPlaceName: "\uD6C4\uD3EC",
    nx: 87,
    ny: 141,
    warnKeyword: "\uB3D9\uD574\uC911\uBD80"
  },
  {
    id: "dt_0013",
    name: "\uC6B8\uB989\uB3C4",
    lat: 37.49138,
    lot: 130.91361,
    tideObsCode: "DT_0013",
    fishingPlaceName: "\uC6B8\uB989\uB3C4",
    nx: 127,
    ny: 128,
    warnKeyword: "\uB3D9\uD574\uC911\uBD80"
  },
  {
    id: "dt_0014",
    name: "\uD1B5\uC601",
    lat: 34.82777,
    lot: 128.43472,
    tideObsCode: "DT_0014",
    fishingPlaceName: "\uAC70\uC81C\uB3C4",
    nx: 87,
    ny: 68,
    warnKeyword: "\uB0A8\uD574\uB3D9\uBD80"
  },
  {
    id: "dt_0016",
    name: "\uC5EC\uC218",
    lat: 34.74722,
    lot: 127.76555,
    tideObsCode: "DT_0016",
    fishingPlaceName: "\uC695\uC9C0\uB3C4",
    nx: 75,
    ny: 66,
    warnKeyword: "\uB0A8\uD574\uC11C\uBD80"
  },
  {
    id: "dt_0017",
    name: "\uB300\uC0B0",
    lat: 37.0075,
    lot: 126.35277,
    tideObsCode: "DT_0017",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 49,
    ny: 114,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "gunsan",
    name: "\uAD70\uC0B0",
    lat: 35.97555,
    lot: 126.56305,
    tideObsCode: "DT_0018",
    fishingPlaceName: "\uC2E0\uC2DC\uB3C4",
    nx: 53,
    ny: 92,
    warnKeyword: "\uC11C\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0020",
    name: "\uC6B8\uC0B0",
    lat: 35.50194,
    lot: 129.38722,
    tideObsCode: "DT_0020",
    fishingPlaceName: "\uAC70\uC81C\uB3C4",
    nx: 103,
    ny: 83,
    warnKeyword: "\uB3D9\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0021",
    name: "\uCD94\uC790\uB3C4",
    lat: 33.96194,
    lot: 126.30027,
    tideObsCode: "DT_0021",
    fishingPlaceName: "\uCD94\uC790\uB3C4",
    nx: 48,
    ny: 48,
    warnKeyword: "\uC11C\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0022",
    name: "\uC131\uC0B0\uD3EC",
    lat: 33.47472,
    lot: 126.92777,
    tideObsCode: "DT_0022",
    fishingPlaceName: "\uAC70\uBB38\uB3C4",
    nx: 60,
    ny: 37,
    warnKeyword: "\uC81C\uC8FC\uB3C4"
  },
  {
    id: "dt_0023",
    name: "\uBAA8\uC2AC\uD3EC",
    lat: 33.21444,
    lot: 126.25111,
    tideObsCode: "DT_0023",
    fishingPlaceName: "\uCD94\uC790\uB3C4",
    nx: 48,
    ny: 32,
    warnKeyword: "\uC81C\uC8FC\uB3C4"
  },
  {
    id: "dt_0024",
    name: "\uC7A5\uD56D",
    lat: 36.00694,
    lot: 126.6875,
    tideObsCode: "DT_0024",
    fishingPlaceName: "\uC2E0\uC2DC\uB3C4",
    nx: 55,
    ny: 93,
    warnKeyword: "\uC11C\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0025",
    name: "\uBCF4\uB839",
    lat: 36.40638,
    lot: 126.48611,
    tideObsCode: "DT_0025",
    fishingPlaceName: "\uC5B4\uCCAD\uB3C4",
    nx: 52,
    ny: 101,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0026",
    name: "\uACE0\uD765\uBC1C\uD3EC",
    lat: 34.48111,
    lot: 127.34277,
    tideObsCode: "DT_0026",
    fishingPlaceName: "\uAC70\uBB38\uB3C4",
    nx: 67,
    ny: 60,
    warnKeyword: "\uB0A8\uD574\uC11C\uBD80"
  },
  {
    id: "dt_0027",
    name: "\uC644\uB3C4",
    lat: 34.31555,
    lot: 126.75972,
    tideObsCode: "DT_0027",
    fishingPlaceName: "\uCD94\uC790\uB3C4",
    nx: 57,
    ny: 56,
    warnKeyword: "\uC11C\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0028",
    name: "\uC9C4\uB3C4",
    lat: 34.37777,
    lot: 126.30861,
    tideObsCode: "DT_0028",
    fishingPlaceName: "\uCD94\uC790\uB3C4",
    nx: 49,
    ny: 57,
    warnKeyword: "\uC11C\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0029",
    name: "\uAC70\uC81C\uB3C4",
    lat: 34.80138,
    lot: 128.69916,
    tideObsCode: "DT_0029",
    fishingPlaceName: "\uAC70\uC81C\uB3C4",
    nx: 91,
    ny: 67,
    warnKeyword: "\uB0A8\uD574\uB3D9\uBD80"
  },
  {
    id: "dt_0031",
    name: "\uAC70\uBB38\uB3C4",
    lat: 34.02833,
    lot: 127.30888,
    tideObsCode: "DT_0031",
    fishingPlaceName: "\uAC70\uBB38\uB3C4",
    nx: 67,
    ny: 50,
    warnKeyword: "\uB0A8\uD574\uC11C\uBD80"
  },
  {
    id: "dt_0032",
    name: "\uAC15\uD654\uB300\uAD50",
    lat: 37.73194,
    lot: 126.52222,
    tideObsCode: "DT_0032",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 52,
    ny: 130,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0035",
    name: "\uD751\uC0B0\uB3C4",
    lat: 34.68416,
    lot: 125.43555,
    tideObsCode: "DT_0035",
    fishingPlaceName: "\uAC00\uAC70\uB3C4",
    nx: 33,
    ny: 64,
    warnKeyword: "\uC11C\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0036",
    name: "\uB300\uCCAD\uB3C4",
    lat: 37.82522,
    lot: 124.71805,
    tideObsCode: "DT_0036",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 21,
    ny: 132,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0037",
    name: "\uC5B4\uCCAD\uB3C4",
    lat: 36.11722,
    lot: 125.98472,
    tideObsCode: "DT_0037",
    fishingPlaceName: "\uC5B4\uCCAD\uB3C4",
    nx: 43,
    ny: 95,
    warnKeyword: "\uC11C\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0038",
    name: "\uAD74\uC5C5\uB3C4",
    lat: 37.19444,
    lot: 125.995,
    tideObsCode: "DT_0038",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 43,
    ny: 119,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0039",
    name: "\uC655\uB3CC\uCD08",
    lat: 36.71916,
    lot: 129.7325,
    tideObsCode: "DT_0039",
    fishingPlaceName: "\uD6C4\uD3EC",
    nx: 108,
    ny: 110,
    warnKeyword: "\uB3D9\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0041",
    name: "\uBCF5\uC0AC\uCD08",
    lat: 34.09833,
    lot: 126.16833,
    tideObsCode: "DT_0041",
    fishingPlaceName: "\uCD94\uC790\uB3C4",
    nx: 46,
    ny: 51,
    warnKeyword: "\uC11C\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0042",
    name: "\uAD50\uBCF8\uCD08",
    lat: 34.70472,
    lot: 128.30638,
    tideObsCode: "DT_0042",
    fishingPlaceName: "\uC695\uC9C0\uB3C4",
    nx: 84,
    ny: 65,
    warnKeyword: "\uB0A8\uD574\uB3D9\uBD80"
  },
  {
    id: "dt_0043",
    name: "\uC601\uD765\uB3C4",
    lat: 37.23861,
    lot: 126.42861,
    tideObsCode: "DT_0043",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 50,
    ny: 120,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0044",
    name: "\uC601\uC885\uB300\uAD50",
    lat: 37.54555,
    lot: 126.58444,
    tideObsCode: "DT_0044",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 53,
    ny: 126,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0046",
    name: "\uC30D\uC815\uCD08",
    lat: 37.55616,
    lot: 130.93921,
    tideObsCode: "DT_0046",
    fishingPlaceName: "\uC6B8\uB989\uB3C4",
    nx: 128,
    ny: 129,
    warnKeyword: "\uB3D9\uD574\uC911\uBD80"
  },
  {
    id: "dt_0047",
    name: "\uB3C4\uB18D\uD0C4",
    lat: 33.15805,
    lot: 126.27472,
    tideObsCode: "DT_0047",
    fishingPlaceName: "\uCD94\uC790\uB3C4",
    nx: 48,
    ny: 30,
    warnKeyword: "\uC81C\uC8FC\uB3C4"
  },
  {
    id: "dt_0048",
    name: "\uC18D\uCD08\uB4F1\uD45C",
    lat: 38.19947,
    lot: 128.61308,
    tideObsCode: "DT_0048",
    fishingPlaceName: "\uD6C4\uD3EC",
    nx: 87,
    ny: 141,
    warnKeyword: "\uB3D9\uD574\uC911\uBD80"
  },
  {
    id: "dt_0049",
    name: "\uAD11\uC591",
    lat: 34.90367,
    lot: 127.75483,
    tideObsCode: "DT_0049",
    fishingPlaceName: "\uC695\uC9C0\uB3C4",
    nx: 74,
    ny: 69,
    warnKeyword: "\uB0A8\uD574\uC11C\uBD80"
  },
  {
    id: "dt_0050",
    name: "\uD0DC\uC548",
    lat: 36.91305,
    lot: 126.23888,
    tideObsCode: "DT_0050",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 47,
    ny: 112,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0051",
    name: "\uC11C\uCC9C\uB9C8\uB7C9",
    lat: 36.12888,
    lot: 126.49527,
    tideObsCode: "DT_0051",
    fishingPlaceName: "\uC2E0\uC2DC\uB3C4",
    nx: 52,
    ny: 95,
    warnKeyword: "\uC11C\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0052",
    name: "\uC778\uCC9C\uC1A1\uB3C4",
    lat: 37.33805,
    lot: 126.58611,
    tideObsCode: "DT_0052",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 53,
    ny: 122,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0054",
    name: "\uC9C4\uD574",
    lat: 35.14722,
    lot: 128.64305,
    tideObsCode: "DT_0054",
    fishingPlaceName: "\uAC70\uC81C\uB3C4",
    nx: 90,
    ny: 75,
    warnKeyword: "\uB0A8\uD574\uB3D9\uBD80"
  },
  {
    id: "dt_0056",
    name: "\uBD80\uC0B0\uD56D\uC2E0\uD56D",
    lat: 35.0775,
    lot: 128.78472,
    tideObsCode: "DT_0056",
    fishingPlaceName: "\uAC70\uC81C\uB3C4",
    nx: 93,
    ny: 73,
    warnKeyword: "\uB0A8\uD574\uB3D9\uBD80"
  },
  {
    id: "dt_0057",
    name: "\uB3D9\uD574\uD56D",
    lat: 37.49472,
    lot: 129.14388,
    tideObsCode: "DT_0057",
    fishingPlaceName: "\uD6C4\uD3EC",
    nx: 97,
    ny: 126,
    warnKeyword: "\uB3D9\uD574\uC911\uBD80"
  },
  {
    id: "dt_0058",
    name: "\uACBD\uC778\uD56D",
    lat: 37.56083,
    lot: 126.60111,
    tideObsCode: "DT_0058",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 53,
    ny: 127,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0059",
    name: "\uBC31\uB839\uB3C4",
    lat: 37.95565,
    lot: 124.73608,
    tideObsCode: "DT_0059",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 21,
    ny: 135,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0060",
    name: "\uC5F0\uD3C9\uB3C4",
    lat: 37.65766,
    lot: 125.71441,
    tideObsCode: "DT_0060",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 38,
    ny: 129,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0061",
    name: "\uC0BC\uCC9C\uD3EC",
    lat: 34.92416,
    lot: 128.06972,
    tideObsCode: "DT_0061",
    fishingPlaceName: "\uC695\uC9C0\uB3C4",
    nx: 80,
    ny: 70,
    warnKeyword: "\uB0A8\uD574\uB3D9\uBD80"
  },
  {
    id: "dt_0062",
    name: "\uB9C8\uC0B0",
    lat: 35.1975,
    lot: 128.57638,
    tideObsCode: "DT_0062",
    fishingPlaceName: "\uAC70\uC81C\uB3C4",
    nx: 89,
    ny: 76,
    warnKeyword: "\uB0A8\uD574\uB3D9\uBD80"
  },
  {
    id: "dt_0063",
    name: "\uAC00\uB355\uB3C4",
    lat: 35.02417,
    lot: 128.81093,
    tideObsCode: "DT_0063",
    fishingPlaceName: "\uAC70\uC81C\uB3C4",
    nx: 93,
    ny: 72,
    warnKeyword: "\uB0A8\uD574\uB3D9\uBD80"
  },
  {
    id: "dt_0064",
    name: "\uAD50\uB3D9\uB300\uAD50",
    lat: 37.78961,
    lot: 126.33961,
    tideObsCode: "DT_0064",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 49,
    ny: 131,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0065",
    name: "\uB355\uC801\uB3C4",
    lat: 37.22633,
    lot: 126.15655,
    tideObsCode: "DT_0065",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 46,
    ny: 119,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0066",
    name: "\uD5A5\uD654\uB3C4",
    lat: 35.16766,
    lot: 126.35955,
    tideObsCode: "DT_0066",
    fishingPlaceName: "\uC2E0\uC2DC\uB3C4",
    nx: 49,
    ny: 74,
    warnKeyword: "\uC11C\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0067",
    name: "\uC548\uD765",
    lat: 36.67463,
    lot: 126.12955,
    tideObsCode: "DT_0067",
    fishingPlaceName: "\uC5B4\uCCAD\uB3C4",
    nx: 45,
    ny: 107,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0068",
    name: "\uC704\uB3C4",
    lat: 35.61808,
    lot: 126.30181,
    tideObsCode: "DT_0068",
    fishingPlaceName: "\uC2E0\uC2DC\uB3C4",
    nx: 48,
    ny: 84,
    warnKeyword: "\uC11C\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0091",
    name: "\uD3EC\uD56D",
    lat: 36.05177,
    lot: 129.37627,
    tideObsCode: "DT_0091",
    fishingPlaceName: "\uD6C4\uD3EC",
    nx: 102,
    ny: 95,
    warnKeyword: "\uB3D9\uD574\uB0A8\uBD80"
  },
  {
    id: "dt_0092",
    name: "\uC5EC\uD638\uD56D",
    lat: 34.66194,
    lot: 127.46916,
    tideObsCode: "DT_0092",
    fishingPlaceName: "\uAC70\uBB38\uB3C4",
    nx: 69,
    ny: 64,
    warnKeyword: "\uB0A8\uD574\uC11C\uBD80"
  },
  {
    id: "dt_0093",
    name: "\uC18C\uBB34\uC758\uB3C4",
    lat: 37.37306,
    lot: 126.44006,
    tideObsCode: "DT_0093",
    fishingPlaceName: "\uC601\uD765\uB3C4",
    nx: 51,
    ny: 122,
    warnKeyword: "\uC11C\uD574\uC911\uBD80"
  },
  {
    id: "dt_0094",
    name: "\uC11C\uAC70\uCC28\uB3C4",
    lat: 34.25142,
    lot: 125.91544,
    tideObsCode: "DT_0094",
    fishingPlaceName: "\uCD94\uC790\uB3C4",
    nx: 41,
    ny: 54,
    warnKeyword: "\uC11C\uD574\uB0A8\uBD80"
  }
];

// src/points.ts
var POINTS = points_gen_default;
function sortByDistance(points, lat, lot) {
  const d = /* @__PURE__ */ __name((p) => {
    const dx = (p.lot - lot) * Math.cos(lat * Math.PI / 180);
    const dy = p.lat - lat;
    return dx * dx + dy * dy;
  }, "d");
  return [...points].sort((a, b) => d(a) - d(b));
}
__name(sortByDistance, "sortByDistance");

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
  if (!point.fishingPlaceName) return [];
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
async function mapPins(near, limit, env, ctx) {
  const now = kstNow();
  const today = kstDate();
  const todayDashed = `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`;
  const warningText = await fetchWarningText(env, ctx);
  const targets = sortByDistance(POINTS, near.lat, near.lot).slice(0, limit);
  return Promise.all(
    targets.map(async (point) => {
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
        const [lat, lot] = (url.searchParams.get("near") ?? "36.8,126.6").split(",").map(Number);
        const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "12", 10) || 12, 1), 20);
        if (!Number.isFinite(lat) || !Number.isFinite(lot)) return json({ error: "bad near" }, 400);
        return json(await mapPins({ lat, lot }, limit, env, ctx));
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
