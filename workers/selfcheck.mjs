// 실행: node --experimental-strip-types selfcheck.mjs
import assert from "node:assert/strict";
import {
  buildTimeline,
  computeSignal,
  findMarineWarning,
  mulName,
  mulNameFromLunarDay,
  parseTide,
  pickFishing,
  summarizeForecast,
} from "./src/logic.ts";

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

// findMarineWarning — 구역명 매칭 + 해상 특보 종류만 + 경보 우선 (warnVar 6=풍랑, 2=호우 / warnStress 1=경보)
const warns = [
  { areaName: "인천·경기남부앞바다", warnVar: 6, warnStress: 0 },
  { areaName: "인천·경기남부앞바다", warnVar: 6, warnStress: 1 },
  { areaName: "의성군", warnVar: 2, warnStress: 1 },
];
assert.equal(findMarineWarning(warns, "인천·경기남부앞바다"), "풍랑경보 발효 중"); // 경보 > 주의보
assert.equal(findMarineWarning(warns, "충남북부앞바다"), null); // 다른 해역
assert.equal(findMarineWarning([{ areaName: "부산앞바다", warnVar: 2, warnStress: 1 }], "부산앞바다"), null); // 해상 특보 아님

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

// buildTimeline — 현재 이후 슬롯만, 시간순, 카테고리 병합
const tl = buildTimeline(
  [
    { category: "TMP", fcstDate: "20260718", fcstTime: "1400", fcstValue: "26" },
    { category: "TMP", fcstDate: "20260718", fcstTime: "1800", fcstValue: "27" },
    { category: "SKY", fcstDate: "20260718", fcstTime: "1800", fcstValue: "1" },
    { category: "POP", fcstDate: "20260718", fcstTime: "1800", fcstValue: "30" },
    { category: "WSD", fcstDate: "20260718", fcstTime: "1800", fcstValue: "4.2" },
    { category: "TMP", fcstDate: "20260719", fcstTime: "0000", fcstValue: "24" },
  ],
  "202607181500",
);
assert.equal(tl.length, 2);
assert.deepEqual(tl[0], { time: "18:00", temp: 27, sky: "맑음", pop: 30, windSpeed: 4.2, wave: null });
assert.equal(tl[1].time, "00:00");

// mulName — 유효한 물때 이름 반환
assert.ok(/^(\d+물|조금|무시)$/.test(mulName(new Date())));

// mulNameFromLunarDay — 음력 1일=7물, 8일=조금, 15일=6물, 16일=7물(주기 반복)
assert.equal(mulNameFromLunarDay(1), "7물");
assert.equal(mulNameFromLunarDay(8), "조금");
assert.equal(mulNameFromLunarDay(15), "6물");
assert.equal(mulNameFromLunarDay(16), "7물");
assert.equal(mulNameFromLunarDay(30), "6물");

console.log("selfcheck OK");
