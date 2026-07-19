// 실행: node --experimental-strip-types selfcheck.mjs
import assert from "node:assert/strict";
import { computeSignal, findMarineWarning, mulName, parseTide, pickFishing, summarizeForecast } from "./src/logic.ts";

// parseTide — 실응답(인천 2026-07-18) 기준: 1,3=고조 / 2,4=저조
const tide = parseTide([
  { predcDt: "2026-07-18 01:21", predcTdlvVl: 23, extrSe: "2" },
  { predcDt: "2026-07-18 07:32", predcTdlvVl: 933, extrSe: "1" },
  { predcDt: "2026-07-18 13:57", predcTdlvVl: 97, extrSe: "4" },
  { predcDt: "2026-07-18 19:47", predcTdlvVl: 844, extrSe: "3" },
]);
assert.deepEqual(tide.highs, [
  { time: "07:32", level: 933 },
  { time: "19:47", level: 844 },
]);
assert.deepEqual(tide.lows, [
  { time: "01:21", level: 23 },
  { time: "13:57", level: 97 },
]);

// pickFishing — 기타어종 우선, 시간대 매칭
const fish = [
  {
    seafsPstnNm: "영흥도",
    predcYmd: "2026-07-18",
    predcNoonSeCd: "오전",
    seafsTgfshNm: "농어",
    totalIndex: "좋음",
    minWvhgt: 0,
    maxWvhgt: 0.4,
    minWtem: 23,
    maxWtem: 24,
    minWspd: 1,
    maxWspd: 3,
  },
  {
    seafsPstnNm: "영흥도",
    predcYmd: "2026-07-18",
    predcNoonSeCd: "오후",
    seafsTgfshNm: "기타어종",
    totalIndex: "보통",
    minWvhgt: 0,
    maxWvhgt: 0.1,
    minWtem: 23,
    maxWtem: 24,
    minWspd: 2,
    maxWspd: 4,
  },
];
assert.equal(pickFishing(fish, "2026-07-18", true).totalIndex, "보통");
assert.equal(pickFishing(fish, "2026-07-18", false).totalIndex, "좋음");

// summarizeForecast — 최대값 집계
const fc = summarizeForecast(
  [
    { category: "WSD", fcstDate: "20260718", fcstTime: "1800", fcstValue: "1.6" },
    { category: "WSD", fcstDate: "20260718", fcstTime: "2100", fcstValue: "8.2" },
    { category: "WAV", fcstDate: "20260718", fcstTime: "1800", fcstValue: "0.5" },
    { category: "POP", fcstDate: "20260718", fcstTime: "1800", fcstValue: "30" },
    { category: "SKY", fcstDate: "20260718", fcstTime: "1800", fcstValue: "4" },
    { category: "VEC", fcstDate: "20260718", fcstTime: "1800", fcstValue: "104" },
    { category: "TMP", fcstDate: "20260718", fcstTime: "1800", fcstValue: "27" },
    { category: "WSD", fcstDate: "20260719", fcstTime: "0000", fcstValue: "15" }, // 다른 날 → 무시
  ],
  "20260718",
);
assert.equal(fc.maxWindSpeed, 8.2);
assert.equal(fc.sky, "흐림");
assert.equal(fc.windDir, "동");
assert.equal(fc.temp, 27);

// findMarineWarning — 해역 키워드 + 해상 특보만 매칭
assert.equal(findMarineWarning("o 풍랑주의보 : 서해중부앞바다", "서해중부"), "풍랑주의보 발효 중");
assert.equal(findMarineWarning("o 폭염경보 : 서해중부앞바다", "서해중부"), null); // 해상 특보 아님
assert.equal(findMarineWarning("o 풍랑주의보 : 동해남부앞바다", "서해중부"), null); // 다른 해역

// computeSignal — 기획서 §3
const calmFc = { maxWindSpeed: 3, maxWaveHeight: 0.3, maxPop: 20, sky: "맑음", temp: 25, windDir: "북서" };
assert.equal(
  computeSignal({ warning: "풍랑주의보 발효 중", totalIndex: "매우좋음", forecast: calmFc, mul: "7물" }).level,
  "red",
); // 특보 = 무조건 빨강
assert.equal(computeSignal({ warning: null, totalIndex: "좋음", forecast: calmFc, mul: "7물" }).level, "green");
assert.equal(computeSignal({ warning: null, totalIndex: "보통", forecast: calmFc, mul: "7물" }).level, "yellow");
assert.equal(computeSignal({ warning: null, totalIndex: "매우나쁨", forecast: calmFc, mul: "7물" }).level, "red");
// 보정 강등: 지수 좋음 + 풍속 9 초과 → yellow
const windyFc = { ...calmFc, maxWindSpeed: 10 };
assert.equal(computeSignal({ warning: null, totalIndex: "좋음", forecast: windyFc, mul: "7물" }).level, "yellow");

// mulName — 유효한 물때 이름 반환
assert.ok(/^(\d+물|조금|무시)$/.test(mulName(new Date())));

console.log("selfcheck OK");
