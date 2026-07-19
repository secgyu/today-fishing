import { getCurrentLocation } from "@apps-in-toss/web-framework";

export interface LatLng {
  lat: number;
  lot: number;
}

// Accuracy.Balanced(3) — enum이 타입 패키지에서 밍글링되어 숫자 리터럴 사용
const BALANCED = 3 as Parameters<typeof getCurrentLocation>[0]["accuracy"];

function browserLocation(): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lot: p.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 },
    );
  });
}

/**
 * 내 위치 — 토스 앱 브릿지 우선, 실패 시 브라우저 API, 그래도 실패면 null
 * @param askAgain 거부 상태여도 권한 다이얼로그 재요청 (사용자가 버튼을 눌렀을 때만 true)
 */
export async function getMyLocation(askAgain = false): Promise<LatLng | null> {
  try {
    // 권한 미결정이면 다이얼로그 먼저 — 결정 없이 호출하면 에러로 떨어짐
    let status = await getCurrentLocation.getPermission();
    if (status === "notDetermined" || (askAgain && status === "denied")) {
      status = await getCurrentLocation.openPermissionDialog();
    }
    if (status !== "allowed") return null;

    const res = await getCurrentLocation({ accuracy: BALANCED });
    return { lat: res.coords.latitude, lot: res.coords.longitude };
  } catch {
    // 토스 앱 밖(일반 브라우저) — 브릿지 없음
    return browserLocation();
  }
}

/** 최근접 포인트 (등장방형 근사 — 국내 거리 비교엔 충분) */
export function nearestPoint<T extends LatLng>(points: T[], loc: LatLng): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const p of points) {
    const dx = (p.lot - loc.lot) * Math.cos((loc.lat * Math.PI) / 180);
    const dy = p.lat - loc.lat;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}
