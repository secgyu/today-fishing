import { adaptive } from "@toss/tds-colors";
import { Badge, Button } from "@toss/tds-mobile";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { useApi, type SignalLevel } from "./api";
import type { LatLng } from "./location";

const VWORLD_KEY = import.meta.env.VITE_VWORLD_KEY as string | undefined;
// 타일 URL 추상화 — VWorld 장애·정책 변경 시 폴백 교체 지점 (기획서 §9)
const TILE_URL = VWORLD_KEY
  ? `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png`
  : "https://tile.openstreetmap.org/{z}/{x}/{y}.png"; // 키 없을 때 개발용 폴백
const TILE_ATTRIBUTION = VWORLD_KEY ? "© VWorld" : "© OpenStreetMap contributors";

export interface MapPin {
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
};

const BADGE_COLOR: Record<SignalLevel, "green" | "yellow" | "red"> = {
  green: "green",
  yellow: "yellow",
  red: "red",
};

const SIGNAL_LABEL: Record<SignalLevel, string> = {
  green: "출조 좋음",
  yellow: "주의",
  red: "비추천",
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

export function MapTab({ onGoHome, myLoc, onLocate, favorites, onToggleFavorite }: MapTabProps) {
  const { data: pins } = useApi<MapPin[]>(myLoc ? `/api/map?near=${myLoc.lat},${myLoc.lot}` : "/api/map");
  const [selected, setSelected] = useState<MapPin | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [36.8, 126.6],
      zoom: 8,
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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

  // 내 위치: 파란 점 마커 + 지도 중심 이동
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !myLoc) return;
    const marker = L.marker([myLoc.lat, myLoc.lot], { icon: MY_LOCATION_ICON, interactive: false }).addTo(map);
    map.setView([myLoc.lat, myLoc.lot], 10);
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
              <Badge variant="fill" color={BADGE_COLOR[selected.signal.level]} size="small">
                {SIGNAL_LABEL[selected.signal.level]}
              </Badge>
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
