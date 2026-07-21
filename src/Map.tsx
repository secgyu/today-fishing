import { adaptive } from "@toss/tds-colors";
import { Badge, Button } from "@toss/tds-mobile";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { useApi, type SignalLevel } from "./api";
import type { LatLng } from "./location";
import { LoadingPill } from "./StaleBanner";

const VWORLD_KEY = import.meta.env.VITE_VWORLD_KEY as string | undefined;
// 타일 URL 추상화 — VWorld 장애·정책 변경 시 폴백 교체 지점 (기획서 §9)
const TILE_URL = VWORLD_KEY
  ? `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png`
  : "https://tile.openstreetmap.org/{z}/{x}/{y}.png"; // 키 없을 때 개발용 폴백
const TILE_ATTRIBUTION = VWORLD_KEY ? "© VWorld" : "© OpenStreetMap contributors";

interface MapPin {
  id: string;
  name: string;
  lat: number;
  lot: number;
  signal: { level: SignalLevel; reason: string };
  windDir: string;
  windDeg: number | null;
  windSpeed: number | null;
}

const PIN_COLOR: Record<SignalLevel, string> = {
  green: "#02b262",
  yellow: "#e5a800",
  red: "#f04452",
  unknown: "#8b95a1",
};

const BADGE_COLOR: Record<Exclude<SignalLevel, "unknown">, "green" | "yellow" | "red"> = {
  green: "green",
  yellow: "yellow",
  red: "red",
};

const SIGNAL_LABEL: Record<SignalLevel, string> = {
  green: "출조 좋음",
  yellow: "주의",
  red: "비추천",
  unknown: "판단 불가",
};

/** 신호등 색 원 + 풍향 화살표(부는 방향) + 풍속 라벨 */
function pinIcon(pin: MapPin): L.DivIcon {
  const color = PIN_COLOR[pin.signal.level];
  // 기상청 VEC = 바람이 불어오는 방향 → 화살표는 반대(불어가는 방향)로 회전
  const rotation = pin.windDeg === null ? null : (pin.windDeg + 180) % 360;
  const arrow =
    rotation === null
      ? ""
      : `<svg width="34" height="34" viewBox="0 0 34 34" style="position:absolute;top:-5px;left:-5px;transform:rotate(${rotation}deg)">
           <path d="M17 1 L21 8 L13 8 Z" fill="${color}" stroke="white" stroke-width="1"/>
         </svg>`;
  return L.divIcon({
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<div style="position:relative;width:24px;height:24px">
        <div style="width:24px;height:24px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>
        ${arrow}
        <div style="position:absolute;top:26px;left:50%;transform:translateX(-50%);background:white;border-radius:7px;padding:2px 7px;font-size:13px;font-weight:700;color:#333;box-shadow:0 1px 3px rgba(0,0,0,.25);white-space:nowrap">${pin.windSpeed ?? "-"}m/s</div>
      </div>`,
  });
}

/** 내 위치 — 파란 점 */
const MY_LOCATION_ICON = L.divIcon({
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#3182f6;border:3px solid white;box-shadow:0 0 0 4px rgba(49,130,246,.25),0 1px 4px rgba(0,0,0,.3)"></div>`,
});

interface MapTabProps {
  onGoHome: (pointId: string) => void;
  myLoc: LatLng | null;
  onLocate: () => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

/** 두 지점 거리(km) — 등장방형 근사 */
function distKm(a: LatLng, b: LatLng): number {
  const dx = (a.lot - b.lot) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  const dy = (a.lat - b.lat) * 111.32;
  return Math.hypot(dx, dy);
}

/** 검색 중심에서 이만큼 벗어나면 "이 지역에서 다시 찾기" 버튼 노출 */
const RESEARCH_KM = 10;

export function MapTab({ onGoHome, myLoc, onLocate, favorites, onToggleFavorite }: MapTabProps) {
  // 핀을 불러온 기준 중심 — 내 위치가 오면 따라가고, "다시 찾기"를 누르면 지도 중심으로 바뀜
  const [searchCenter, setSearchCenter] = useState<LatLng | null>(myLoc);
  const [movedAway, setMovedAway] = useState(false);
  const { data: pins, loading } = useApi<MapPin[]>(
    searchCenter ? `/api/map?near=${searchCenter.lat},${searchCenter.lot}` : "/api/map",
  );
  const [selected, setSelected] = useState<MapPin | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const searchCenterRef = useRef(searchCenter);
  searchCenterRef.current = searchCenter;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [36.8, 126.6],
      zoom: 8,
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(map);
    map.on("moveend", () => {
      const c = map.getCenter();
      const base = searchCenterRef.current ?? { lat: 36.8, lot: 126.6 };
      setMovedAway(distKm({ lat: c.lat, lot: c.lng }, base) > RESEARCH_KM);
    });
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const researchHere = () => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    setSearchCenter({ lat: c.lat, lot: c.lng });
    setMovedAway(false);
  };

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !pins) return;
    layer.clearLayers();
    for (const pin of pins) {
      L.marker([pin.lat, pin.lot], { icon: pinIcon(pin) })
        .on("click", () => setSelected(pin))
        .addTo(layer);
    }
  }, [pins]);

  // 내 위치: 파란 점 마커 + 지도 중심 이동 + 검색 중심도 따라감
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !myLoc) return;
    const marker = L.marker([myLoc.lat, myLoc.lot], { icon: MY_LOCATION_ICON, interactive: false }).addTo(map);
    map.setView([myLoc.lat, myLoc.lot], 10);
    setSearchCenter(myLoc);
    setMovedAway(false);
    return () => {
      marker.remove();
    };
  }, [myLoc]);

  return (
    <div style={{ position: "relative" }}>
      {/* 지도 영역만 핀치줌 허용 (앱인토스: 지도는 예외) — Leaflet이 자체 제스처 처리 */}
      <div
        ref={containerRef}
        style={{ height: "calc(100vh - 220px)", minHeight: 320, touchAction: "none" }}
        aria-label="포인트 지도"
      />

      <LoadingPill show={loading} />

      {movedAway && !loading && (
        <button
          type="button"
          onClick={researchHere}
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            border: "none",
            borderRadius: 20,
            padding: "10px 18px",
            backgroundColor: "#3182f6",
            color: "white",
            fontSize: 15,
            fontWeight: 700,
            boxShadow: "0 2px 8px rgba(0,0,0,.3)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ↻ 이 지역에서 다시 찾기
        </button>
      )}

      <button
        type="button"
        onClick={onLocate}
        aria-label="내 위치로 이동"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 1000,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "none",
          backgroundColor: adaptive.background,
          boxShadow: "0 2px 8px rgba(0,0,0,.25)",
          fontSize: 18,
          cursor: "pointer",
        }}
      >
        📍
      </button>

      {selected && (
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            zIndex: 1000,
            backgroundColor: adaptive.background,
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 4px 16px rgba(0,0,0,.18)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 16 }}>{selected.name}</strong>
              {selected.signal.level === "unknown" ? (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 6,
                    backgroundColor: adaptive.grey200,
                    color: adaptive.grey700,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {SIGNAL_LABEL.unknown}
                </span>
              ) : (
                <Badge variant="fill" color={BADGE_COLOR[selected.signal.level]} size="small">
                  {SIGNAL_LABEL[selected.signal.level]}
                </Badge>
              )}
              <button
                type="button"
                onClick={() => onToggleFavorite(selected.id)}
                aria-label={favorites.includes(selected.id) ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                style={{
                  border: "none",
                  background: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  padding: 2,
                  color: favorites.includes(selected.id) ? "#e5a800" : adaptive.grey400,
                }}
              >
                {favorites.includes(selected.id) ? "★" : "☆"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="닫기"
              style={{ border: "none", background: "none", fontSize: 18, color: adaptive.grey500, cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          <p style={{ margin: "8px 0 4px", fontSize: 14, color: adaptive.grey700 }}>{selected.signal.reason}</p>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: adaptive.grey500 }}>
            바람 {selected.windDir} {selected.windSpeed ?? "-"}m/s
          </p>
          <Button size="medium" display="block" onClick={() => onGoHome(selected.id)}>
            홈에서 자세히 보기
          </Button>
        </div>
      )}
    </div>
  );
}
