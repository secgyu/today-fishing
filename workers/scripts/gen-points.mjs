/**
 * 포인트 마스터 생성 스크립트.
 * 실행: node scripts/gen-points.mjs  (workers/ 에서)
 *
 * 1) 조석예보 관측소 DT_0001~DT_0099 전수 조회 → 이름·좌표 수집
 * 2) 바다낚시지수(갯바위) 후보 지점명 탐색 → 유효 지점 수집
 * 3) 해양관측부이 TW_0001~TW_0120 전수 조회 → 실측 수온·파고 부이 수집
 * 4) 각 관측소에 기상청 격자(nx,ny)·특보 해역·최근접 지수지점·최근접 부이 매핑
 * 5) src/points.gen.json 출력
 */
import { readFileSync, writeFileSync } from "node:fs";

const env = readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
const KEY = env.match(/^DATA_GO_KR_SERVICE_KEY=(.+)$/m)[1].trim();

const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replaceAll("-", "");

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ── 1. 조석 관측소 전수 조회 ────────────────────────────────
async function probeStations() {
  const codes = Array.from({ length: 99 }, (_, i) => `DT_${String(i + 1).padStart(4, "0")}`);
  const out = [];
  // 동시 8개씩 — 공공데이터포털 부하 방지
  for (let i = 0; i < codes.length; i += 8) {
    const chunk = await Promise.all(
      codes.slice(i, i + 8).map(async (code) => {
        const j = await getJson(
          `https://apis.data.go.kr/1192136/tideFcstHghLw/GetTideFcstHghLwApiService?serviceKey=${KEY}&type=json&obsCode=${code}&reqDate=${today}&numOfRows=1`,
        );
        const item = j?.body?.items?.item?.[0];
        return item ? { code, name: item.obsvtrNm, lat: item.lat, lot: item.lot } : null;
      }),
    );
    out.push(...chunk.filter(Boolean));
    process.stderr.write(`stations ${i + 8}/99\r`);
  }
  return out;
}

// ── 2. 낚시지수 유효 지점 탐색 (좌표는 근사 — 최근접 매핑용) ──
const FISHING_CANDIDATES = [
  ["영흥도", 37.26, 126.47],
  ["덕적도", 37.22, 126.15],
  ["백령도", 37.96, 124.66],
  ["안면도", 36.52, 126.29],
  ["격포", 35.62, 126.46],
  ["어청도", 36.12, 125.98],
  ["신시도", 35.82, 126.42],
  ["흑산도", 34.68, 125.43],
  ["홍도", 34.68, 125.2],
  ["가거도", 34.07, 125.12],
  ["진도", 34.48, 126.26],
  ["완도", 34.31, 126.75],
  ["청산도", 34.17, 126.85],
  ["추자도", 33.95, 126.3],
  ["마라도", 33.12, 126.27],
  ["차귀도", 33.31, 126.16],
  ["우도", 33.5, 126.95],
  ["거문도", 34.03, 127.31],
  ["나로도", 34.46, 127.45],
  ["금오도", 34.52, 127.75],
  ["안도", 34.47, 127.8],
  ["사량도", 34.83, 128.23],
  ["욕지도", 34.62, 128.27],
  ["매물도", 34.63, 128.55],
  ["거제도", 34.85, 128.6],
  ["감포", 35.8, 129.5],
  ["구룡포", 35.98, 129.55],
  ["방어진", 35.49, 129.43],
  ["죽변", 37.05, 129.42],
  ["후포", 36.68, 129.45],
  ["축산", 36.5, 129.45],
  ["임원", 37.22, 129.34],
  ["장호", 37.29, 129.32],
  ["강릉", 37.75, 128.9],
  ["주문진", 37.9, 128.83],
  ["속초", 38.2, 128.6],
  ["거진", 38.45, 128.47],
  ["대진", 38.5, 128.43],
  ["울릉도", 37.48, 130.9],
];

async function probeFishing() {
  const out = [];
  for (let i = 0; i < FISHING_CANDIDATES.length; i += 8) {
    const chunk = await Promise.all(
      FISHING_CANDIDATES.slice(i, i + 8).map(async ([name, lat, lot]) => {
        const j = await getJson(
          `https://apis.data.go.kr/1192136/fcstFishingv2/GetFcstFishingApiServicev2?serviceKey=${KEY}&type=json&gubun=${encodeURIComponent("갯바위")}&placeName=${encodeURIComponent(name)}&numOfRows=1`,
        );
        return j?.body?.items?.item?.[0] ? { name, lat, lot } : null;
      }),
    );
    out.push(...chunk.filter(Boolean));
  }
  return out;
}

// ── 3. 해양관측부이 전수 조회 (실측 수온·파고) ────────────────
async function probeBuoys() {
  const codes = Array.from({ length: 120 }, (_, i) => `TW_${String(i + 1).padStart(4, "0")}`);
  const out = [];
  for (let i = 0; i < codes.length; i += 8) {
    const chunk = await Promise.all(
      codes.slice(i, i + 8).map(async (code) => {
        const j = await getJson(
          `https://apis.data.go.kr/1192136/twRecent/GetTWRecentApiService?serviceKey=${KEY}&type=json&obsCode=${code}&numOfRows=1`,
        );
        const item = j?.body?.items?.item?.[0];
        return item ? { code, name: item.obsvtrNm, lat: item.lat, lot: item.lot } : null;
      }),
    );
    out.push(...chunk.filter(Boolean));
    process.stderr.write(`buoys ${i + 8}/120\r`);
  }
  return out;
}

// ── 4. 기상청 격자 변환 (LCC DFS, 기상청 공식 파라미터) ──────
function toGrid(lat, lon) {
  const RE = 6371.00877,
    GRID = 5.0;
  const DEGRAD = Math.PI / 180;
  const SLAT1 = 30 * DEGRAD,
    SLAT2 = 60 * DEGRAD,
    OLON = 126 * DEGRAD,
    OLAT = 38 * DEGRAD;
  const XO = 43,
    YO = 136;
  const re = RE / GRID;
  const sn =
    Math.log(Math.cos(SLAT1) / Math.cos(SLAT2)) /
    Math.log(Math.tan(Math.PI * 0.25 + SLAT2 * 0.5) / Math.tan(Math.PI * 0.25 + SLAT1 * 0.5));
  const sf = (Math.pow(Math.tan(Math.PI * 0.25 + SLAT1 * 0.5), sn) * Math.cos(SLAT1)) / sn;
  const ro = (re * sf) / Math.pow(Math.tan(Math.PI * 0.25 + OLAT * 0.5), sn);
  const ra = (re * sf) / Math.pow(Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5), sn);
  let theta = lon * DEGRAD - OLON;
  if (theta > Math.PI) theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= sn;
  return { nx: Math.floor(ra * Math.sin(theta) + XO + 0.5), ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5) };
}

/**
 * 기상청 해상특보 앞바다 구역(getPwnCd areaName 기준) 대표좌표 — 최근접 배정.
 * 연안 낚시엔 앞바다 특보가 유효 구역. 울릉도만 먼바다 구역.
 */
const WARN_AREAS = [
  ["인천·경기북부앞바다", 37.75, 126.2],
  ["인천·경기남부앞바다", 37.2, 126.4],
  ["충남북부앞바다", 36.9, 126.2],
  ["충남남부앞바다", 36.3, 126.3],
  ["전북북부앞바다", 36.0, 126.4],
  ["전북남부앞바다", 35.6, 126.3],
  ["전남북부서해앞바다", 35.2, 126.2],
  ["전남중부서해앞바다", 34.8, 126.1],
  ["전남남부서해앞바다", 34.3, 126.0],
  ["전남서부남해앞바다", 34.3, 126.8],
  ["전남동부남해앞바다", 34.6, 127.5],
  ["경남서부남해앞바다", 34.8, 128.1],
  ["거제시동부앞바다", 34.8, 128.75],
  ["부산앞바다", 35.1, 129.1],
  ["울산앞바다", 35.5, 129.45],
  ["경북남부앞바다", 35.9, 129.6],
  ["경북북부앞바다", 36.6, 129.5],
  ["강원남부앞바다", 37.3, 129.3],
  ["강원중부앞바다", 37.8, 128.95],
  ["강원북부앞바다", 38.3, 128.6],
  ["제주도북부앞바다", 33.6, 126.5],
  ["제주도동부앞바다", 33.4, 126.95],
  ["제주도남부앞바다", 33.2, 126.55],
  ["제주도서부앞바다", 33.3, 126.15],
  ["동해중부안쪽먼바다", 37.5, 130.9], // 울릉도·독도
].map(([name, lat, lot]) => ({ name, lat, lot }));

function nearest(list, lat, lot) {
  let best = null,
    bestD = Infinity;
  for (const p of list) {
    const dx = (p.lot - lot) * Math.cos((lat * Math.PI) / 180);
    const dy = p.lat - lat;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

const LEGACY_IDS = { DT_0001: "incheon", DT_0008: "ansan", DT_0018: "gunsan", DT_0005: "busan" };

const [stations, fishing, buoys] = [await probeStations(), await probeFishing(), await probeBuoys()];
console.error(
  `\nstations: ${stations.length}, fishing places: ${fishing.length} (${fishing.map((f) => f.name).join(", ")}), buoys: ${buoys.length}`,
);

const g = toGrid(37.45194, 126.59222);
if (Math.abs(g.nx - 54) > 1 || Math.abs(g.ny - 123) > 1) throw new Error(`grid selfcheck fail: ${JSON.stringify(g)}`);

/** 부이 실측은 30km 이내일 때만 대표값으로 인정 (멀면 오히려 오정보) */
const BUOY_MAX_KM = 30;
function distKm(a, b) {
  const dx = (a.lot - b.lot) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  const dy = (a.lat - b.lat) * 111.32;
  return Math.hypot(dx, dy);
}

const points = stations.map((s) => {
  const grid = toGrid(s.lat, s.lot);
  const buoy = nearest(buoys, s.lat, s.lot);
  return {
    id: LEGACY_IDS[s.code] ?? s.code.toLowerCase(),
    name: s.name,
    lat: s.lat,
    lot: s.lot,
    tideObsCode: s.code,
    fishingPlaceName: nearest(fishing, s.lat, s.lot)?.name ?? null,
    buoyObsCode: buoy && distKm(buoy, s) <= BUOY_MAX_KM ? buoy.code : null,
    nx: grid.nx,
    ny: grid.ny,
    warnKeyword: nearest(WARN_AREAS, s.lat, s.lot).name,
  };
});

writeFileSync(new URL("../src/points.gen.json", import.meta.url), JSON.stringify(points, null, 1));
console.error(`wrote ${points.length} points to src/points.gen.json`);
