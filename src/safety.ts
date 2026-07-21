/** 출조 Go/No-Go 가드 — 틀린 초록 방지용 순수 헬퍼 */

export type LatLng = { lat: number; lot: number };
export type SignalLevel = "green" | "yellow" | "red" | "unknown";
export type Gubun = "갯바위" | "선상";
export type Slot = "오전" | "오후";

/** 이 거리 넘으면 "멀리 있는 포인트" 경고 */
export const FAR_KM = 40;

/** 등장방형 근사 거리(km) — 국내 비교용 */
export function distKm(a: LatLng, b: LatLng): number {
  const dx = (a.lot - b.lot) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  const dy = (a.lat - b.lat) * 111.32;
  return Math.hypot(dx, dy);
}

export function formatDistLabel(km: number): string {
  if (km < 1) return "내 위치 근처";
  return `내 위치에서 ${Math.round(km)}km`;
}

/** 위치도 없고 사용자 선택도 없으면 포인트 강제 — 조용한 points[0] 폴백 금지 */
export function needsPointPick(input: { hasLocation: boolean; userPicked: boolean }): boolean {
  return !input.hasLocation && !input.userPicked;
}

export function needsGubunPick(stored: string | null): boolean {
  return stored !== "갯바위" && stored !== "선상";
}

/**
 * 화면용 신호등 레벨.
 * stale / 특보확인실패 / 백엔드 unknown → Go/No-Go 배지 숨김.
 */
export function displaySignalLevel(
  level: SignalLevel,
  flags: { stale: boolean; warningUnavailable: boolean },
): SignalLevel {
  if (flags.stale || flags.warningUnavailable || level === "unknown") return "unknown";
  return level;
}

/** KST 시(0~23) 기준 기본 오전/오후 슬롯 */
export function defaultSlot(hour: number): Slot {
  return hour >= 12 ? "오후" : "오전";
}
