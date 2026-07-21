// 실행: node --experimental-strip-types src/safety.selfcheck.ts
import assert from "node:assert/strict";
import {
  FAR_KM,
  defaultSlot,
  displaySignalLevel,
  distKm,
  formatDistLabel,
  needsGubunPick,
  needsPointPick,
} from "./safety.ts";

// distKm — 서울~인천 대략 30~45km
const seoul = { lat: 37.5665, lot: 126.978 };
const incheon = { lat: 37.4563, lot: 126.7052 };
const d = distKm(seoul, incheon);
assert.ok(d > 25 && d < 50, `expected ~35km, got ${d}`);

assert.equal(formatDistLabel(0.4), "내 위치 근처");
assert.equal(formatDistLabel(12.3), "내 위치에서 12km");
assert.ok(12.3 > FAR_KM === false);
assert.ok(80 > FAR_KM);

// 위치 없고 사용자 선택도 없으면 포인트 강제 — points[0] 조용 폴백 금지
assert.equal(needsPointPick({ hasLocation: false, userPicked: false }), true);
assert.equal(needsPointPick({ hasLocation: true, userPicked: false }), false);
assert.equal(needsPointPick({ hasLocation: false, userPicked: true }), false);

// 낚시형태 미선택
assert.equal(needsGubunPick(null), true);
assert.equal(needsGubunPick("갯바위"), false);
assert.equal(needsGubunPick("선상"), false);
assert.equal(needsGubunPick("기타"), true);

// stale / unknown / 특보확인실패 → Go/No-Go 배지 숨김
assert.equal(displaySignalLevel("green", { stale: true, warningUnavailable: false }), "unknown");
assert.equal(displaySignalLevel("green", { stale: false, warningUnavailable: true }), "unknown");
assert.equal(displaySignalLevel("unknown", { stale: false, warningUnavailable: false }), "unknown");
assert.equal(displaySignalLevel("green", { stale: false, warningUnavailable: false }), "green");
assert.equal(displaySignalLevel("red", { stale: false, warningUnavailable: false }), "red");

// 기본 슬롯 — 12시 전 오전
assert.equal(defaultSlot(11), "오전");
assert.equal(defaultSlot(12), "오후");
assert.equal(defaultSlot(0), "오전");

console.log("safety selfcheck OK");
