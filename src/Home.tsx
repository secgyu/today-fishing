import { adaptive } from "@toss/tds-colors";
import { Badge, Button, ListRow, Loader } from "@toss/tds-mobile";
import { useState, type ReactNode } from "react";
import { useApi, type PointSummary, type SignalLevel } from "./api";
import { Detail } from "./Detail";
import { LoadingPill, StaleBanner } from "./StaleBanner";

const SIGNAL_STYLE: Record<
  SignalLevel,
  { label: string; badgeColor: "green" | "yellow" | "red"; bg: string; fg: string }
> = {
  green: { label: "출조 좋음", badgeColor: "green", bg: adaptive.green50, fg: adaptive.green600 },
  yellow: { label: "주의", badgeColor: "yellow", bg: adaptive.yellow50, fg: adaptive.yellow600 },
  red: { label: "비추천", badgeColor: "red", bg: adaptive.red50, fg: adaptive.red600 },
};

function InfoRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <ListRow
      as="div"
      verticalPadding="small"
      contents={<ListRow.Texts type="1RowTypeA" top={label} />}
      right={
        <span style={{ fontSize: big ? 19 : 15, fontWeight: big ? 700 : 500, color: adaptive.grey800 }}>{value}</span>
      }
    />
  );
}

const fmt = (v: number | null, unit: string) => (v === null ? "-" : `${v}${unit}`);

type Gubun = "갯바위" | "선상";
const GUBUN_KEY = "gubun";
const GUBUN_LABEL: Record<Gubun, string> = { 갯바위: "갯바위·방파제", 선상: "선상(배)" };

/** 갯바위·방파제 / 선상 전환 — 선상은 먼바다 기준이라 지수가 다름 */
function GubunToggle({ value, onChange }: { value: Gubun; onChange: (g: Gubun) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="낚시 형태"
      style={{
        display: "flex",
        margin: "12px 24px 0",
        padding: 3,
        borderRadius: 12,
        backgroundColor: adaptive.greyOpacity100,
      }}
    >
      {(Object.keys(GUBUN_LABEL) as Gubun[]).map((g) => (
        <button
          key={g}
          type="button"
          role="radio"
          aria-checked={value === g}
          onClick={() => onChange(g)}
          style={{
            flex: 1,
            border: "none",
            borderRadius: 10,
            padding: "9px 0",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            backgroundColor: value === g ? adaptive.background : "transparent",
            color: value === g ? adaptive.grey800 : adaptive.grey500,
            boxShadow: value === g ? "0 1px 4px rgba(0,0,0,.15)" : "none",
          }}
        >
          {GUBUN_LABEL[g]}
        </button>
      ))}
    </div>
  );
}

interface HomeProps {
  pointId: string | null;
  chips: ReactNode;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export function Home({ pointId, chips, favorites, onToggleFavorite }: HomeProps) {
  const [gubun, setGubun] = useState<Gubun>(() => (localStorage.getItem(GUBUN_KEY) === "선상" ? "선상" : "갯바위"));
  const {
    data: point,
    error,
    staleAt,
    loading,
    retry,
  } = useApi<PointSummary>(pointId ? `/api/home/${pointId}?gubun=${encodeURIComponent(gubun)}` : null);
  const [detailOpen, setDetailOpen] = useState(false);

  const changeGubun = (g: Gubun) => {
    setGubun(g);
    localStorage.setItem(GUBUN_KEY, g);
  };

  if (error) {
    return (
      <div>
        {chips}
        <GubunToggle value={gubun} onChange={changeGubun} />
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ color: adaptive.grey600, marginBottom: 16 }}>정보를 불러오지 못했어요.</p>
          <Button size="medium" onClick={retry}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  if (!point) {
    return (
      <div>
        {chips}
        <GubunToggle value={gubun} onChange={changeGubun} />
        <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
          <Loader size="medium" />
        </div>
      </div>
    );
  }

  const signal = SIGNAL_STYLE[point.signal.level];
  const { tide, now } = point;
  // reason = "주의 · 11물 · 파고 1.2m" — 머리말은 배지와 중복이라 떼고 이유만 크게
  const reasonParts = point.signal.reason.split(" · ");
  const reasonBody = reasonParts.length > 1 ? reasonParts.slice(1).join(" · ") : point.signal.reason;

  return (
    <div style={{ position: "relative" }}>
      {/* 포인트·낚시형태 전환 중 — 기존 내용 위에 스피너만 */}
      <LoadingPill show={loading} />

      {chips}

      <GubunToggle value={gubun} onChange={changeGubun} />

      <StaleBanner staleAt={staleAt} />

      {point.warning && (
        <div
          role="alert"
          style={{
            margin: "12px 24px 0",
            padding: "12px 16px",
            borderRadius: 12,
            backgroundColor: adaptive.red50,
            color: adaptive.red600,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {point.warning}
        </div>
      )}

      <section
        style={{
          margin: "16px 24px",
          padding: 20,
          borderRadius: 20,
          backgroundColor: signal.bg,
        }}
        aria-label="출조 신호등"
      >
        <Badge variant="fill" color={signal.badgeColor} size="medium">
          {signal.label}
        </Badge>
        <p style={{ margin: "12px 0 0", fontSize: 24, fontWeight: 700, color: signal.fg, lineHeight: 1.3 }}>
          {reasonBody}
        </p>
        <div style={{ marginTop: 16 }}>
          <Button size="medium" display="block" onClick={() => setDetailOpen(true)}>
            조위 곡선 · 시간대별 예보 보기
          </Button>
        </div>
      </section>

      {detailOpen && pointId && (
        <Detail
          pointId={pointId}
          favorite={favorites.includes(pointId)}
          onToggleFavorite={() => onToggleFavorite(pointId)}
          onClose={() => setDetailOpen(false)}
        />
      )}

      {/* 만조~수온은 지점 공통 — 토글해도 안 바뀜. 바뀌는 건 위 신호등뿐 */}
      <p style={{ margin: "8px 24px 0", fontSize: 13, fontWeight: 700, color: adaptive.grey500 }}>
        오늘 현장 (지점 공통)
      </p>
      <InfoRow label="만조" value={tide.highs.join(" · ") || "-"} big />
      <InfoRow label="간조" value={tide.lows.join(" · ") || "-"} big />
      <InfoRow label="물때 · 월령" value={`${tide.mul} · ${tide.moon}`} />
      <InfoRow label="파고" value={fmt(now.waveHeight, "m")} />
      <InfoRow label="바람" value={`${now.windDir} ${fmt(now.windSpeed, "m/s")}`} />
      <InfoRow label="날씨 · 기온" value={`${now.weather} · ${fmt(now.airTemp, "°")}`} />
      <InfoRow label="수온" value={fmt(now.waterTemp, "°")} />

      <p
        style={{
          margin: "20px 24px 16px",
          fontSize: 12,
          color: adaptive.grey500,
          textAlign: "center",
        }}
      >
        위 현장 정보는 같은 지점이라 토글해도 같아요. 토글은 출조 신호등(연안/선상 판단)만 바꿔요. 본 정보는
        참고용이에요. 출조 전 기상특보를 꼭 확인하세요.
      </p>
    </div>
  );
}
