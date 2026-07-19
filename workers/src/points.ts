import GEN from "./points.gen.json";

/**
 * 포인트 마스터 테이블 — scripts/gen-points.mjs가 생성한 전국 조석예보 관측소 62곳.
 * 재생성: workers/ 에서 `node scripts/gen-points.mjs`
 */
export interface Point {
  id: string;
  name: string;
  lat: number;
  lot: number;
  tideObsCode: string; // 조석예보 지점
  fishingPlaceName: string | null; // 바다낚시지수 placeName (최근접 유효 지점으로 근사)
  nx: number; // 기상청 격자
  ny: number;
  /** 기상특보 통보문에서 이 키워드 포함 여부로 해당 해역 특보 판정 (좌표 사각 근사) */
  warnKeyword: string;
}

export const POINTS: Point[] = GEN as Point[];

/** near 기준 가까운 순 정렬 (등장방형 근사) */
export function sortByDistance(points: Point[], lat: number, lot: number): Point[] {
  const d = (p: Point) => {
    const dx = (p.lot - lot) * Math.cos((lat * Math.PI) / 180);
    const dy = p.lat - lat;
    return dx * dx + dy * dy;
  };
  return [...points].sort((a, b) => d(a) - d(b));
}
