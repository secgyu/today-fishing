import { adaptive } from "@toss/tds-colors";
import { Loader } from "@toss/tds-mobile";
import { useApi, type PointDetail, type TidePoint } from "./api";

const W = 340;
const H = 140;
const PAD = { top: 18, bottom: 20, left: 8, right: 8 };

const toMin = (t: string) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);

/** 24시간 조위 곡선 SVG — 만·간조 라벨 + 현재 시각 마커 */
function TideCurve({ detail }: { detail: PointDetail }) {
  const { curve, highs, lows, nowTime } = detail;
  if (curve.length < 2) return null;

  const levels = curve.map((c) => c.level);
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const x = (t: string) => PAD.left + (toMin(t) / 1440) * (W - PAD.left - PAD.right);
  const y = (lv: number) => PAD.top + (1 - (lv - min) / (max - min || 1)) * (H - PAD.top - PAD.bottom);

  const path = curve.map((c, i) => `${i === 0 ? "M" : "L"}${x(c.time).toFixed(1)},${y(c.level).toFixed(1)}`).join(" ");
  const area = `${path} L${x(curve[curve.length - 1].time).toFixed(1)},${H - PAD.bottom} L${x(curve[0].time).toFixed(1)},${H - PAD.bottom} Z`;
  const nowX = x(nowTime);

  const label = (p: TidePoint, high: boolean) => (
    <g key={`${high ? "h" : "l"}${p.time}`}>
      <circle cx={x(p.time)} cy={y(p.level)} r={3} fill={high ? "#3182f6" : "#f04452"} />
      <text
        x={x(p.time)}
        y={y(p.level) + (high ? -7 : 13)}
        textAnchor="middle"
        fontSize={10}
        fontWeight={700}
        fill={adaptive.grey700}
      >
        {p.time}
      </text>
    </g>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} aria-label="24시간 조위 곡선">
      <path d={area} fill="#3182f6" opacity={0.12} />
      <path d={path} fill="none" stroke="#3182f6" strokeWidth={2} />
      <line
        x1={nowX}
        y1={PAD.top - 6}
        x2={nowX}
        y2={H - PAD.bottom}
        stroke={adaptive.grey600}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text x={nowX} y={PAD.top - 9} textAnchor="middle" fontSize={10} fontWeight={700} fill={adaptive.grey600}>
        지금
      </text>
      {highs.map((p) => label(p, true))}
      {lows.map((p) => label(p, false))}
    </svg>
  );
}

const fmt = (v: number | null, unit: string) => (v === null ? "-" : `${v}${unit}`);

interface DetailProps {
  pointId: string;
  favorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}

/** 포인트 상세 바텀시트 — 조위 곡선 + 시간대별 예보 + 즐겨찾기 */
export function Detail({ pointId, favorite, onToggleFavorite, onClose }: DetailProps) {
  const { data: detail } = useApi<PointDetail>(`/api/detail/${pointId}`);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="포인트 상세"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 2000, backgroundColor: "rgba(0,0,0,.45)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "80vh",
          overflowY: "auto",
          backgroundColor: adaptive.background,
          borderRadius: "20px 20px 0 0",
          padding: "20px 24px calc(24px + env(safe-area-inset-bottom))",
        }}
      >
        {!detail ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <Loader size="medium" />
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <strong style={{ fontSize: 19 }}>{detail.name}</strong>
                <button
                  type="button"
                  onClick={onToggleFavorite}
                  aria-label={favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                  style={{
                    border: "none",
                    background: "none",
                    fontSize: 20,
                    cursor: "pointer",
                    color: favorite ? "#e5a800" : adaptive.grey400,
                    padding: 2,
                  }}
                >
                  {favorite ? "★" : "☆"}
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                style={{ border: "none", background: "none", fontSize: 18, color: adaptive.grey500, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: "0 0 8px", fontSize: 13, color: adaptive.grey500 }}>오늘 조위 (cm)</p>
            <TideCurve detail={detail} />

            <p style={{ margin: "20px 0 8px", fontSize: 13, color: adaptive.grey500 }}>시간대별 예보</p>
            <div
              style={{ display: "flex", gap: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}
            >
              {detail.timeline.map((s) => (
                <div
                  key={s.time}
                  style={{
                    flex: "0 0 auto",
                    minWidth: 64,
                    textAlign: "center",
                    padding: "10px 8px",
                    borderRadius: 12,
                    backgroundColor: adaptive.greyOpacity50,
                    fontSize: 12,
                    color: adaptive.grey700,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.time}</div>
                  <div>{s.sky}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, margin: "2px 0" }}>{fmt(s.temp, "°")}</div>
                  <div style={{ color: adaptive.blue500 }}>{fmt(s.pop, "%")}</div>
                  <div>{fmt(s.windSpeed, "m/s")}</div>
                  <div>{s.wave === null ? "-" : `${s.wave}m`}</div>
                </div>
              ))}
            </div>

            <p style={{ margin: "16px 0 0", fontSize: 12, color: adaptive.grey500, textAlign: "center" }}>
              본 정보는 참고용이에요. 출조 전 기상특보를 꼭 확인하세요.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
