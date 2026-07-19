/**
 * 포인트 마스터 테이블.
 * ponytail: MVP 3개 지점 하드코딩 — 전국 확장 시 조석 예보지점(약 180개) 기준
 * 정적 JSON으로 재구축. nx/ny는 기상청 격자, 실측 검증 필요.
 */
export interface Point {
  id: string;
  name: string;
  lat: number;
  lot: number;
  tideObsCode: string; // 조석예보 지점
  fishingPlaceName: string; // 바다낚시지수 placeName
  nx: number; // 기상청 격자
  ny: number;
  /** 기상특보 통보문에서 이 키워드 포함 여부로 해당 해역 특보 판정 (조잡함 — 특보구역코드 매핑으로 업그레이드) */
  warnKeyword: string;
}

export const POINTS: Point[] = [
  {
    id: "incheon",
    name: "인천",
    lat: 37.45194,
    lot: 126.59222,
    tideObsCode: "DT_0001",
    fishingPlaceName: "영흥도",
    nx: 54,
    ny: 123,
    warnKeyword: "서해중부",
  },
  {
    id: "ansan",
    name: "안산 방아머리",
    lat: 37.28694,
    lot: 126.58306,
    tideObsCode: "DT_0008",
    fishingPlaceName: "영흥도",
    nx: 57,
    ny: 121,
    warnKeyword: "서해중부",
  },
  {
    id: "gunsan",
    name: "군산 비응항",
    lat: 35.94028,
    lot: 126.52722,
    tideObsCode: "DT_0018",
    fishingPlaceName: "신시도",
    nx: 56,
    ny: 80,
    warnKeyword: "서해중부",
  },
];
