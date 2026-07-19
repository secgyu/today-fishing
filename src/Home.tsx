import { adaptive } from "@toss/tds-colors";
import { Badge, Button, ListRow, Loader } from "@toss/tds-mobile";
import { useState, type ReactNode } from "react";
import { useApi, type PointSummary, type SignalLevel } from "./api";
import { Detail } from "./Detail";

const SIGNAL_STYLE: Record<
  SignalLevel,
  { label: string; badgeColor: "green" | "yellow" | "red"; bg: string; fg: string }
> = {
  green: { label: "출조 좋음", badgeColor: "green", bg: adaptive.green50, fg: adaptive.green600 },
  yellow: { label: "주의", badgeColor: "yellow", bg: adaptive.yellow50, fg: adaptive.yellow600 },
  red: { label: "비추천", badgeColor: "red", bg: adaptive.red50, fg: adaptive.red600 },
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <ListRow
      as="div"
      verticalPadding="small"
      contents={<ListRow.Texts type="1RowTypeA" top={label} />}
      right={<ListRow.Texts type="Right1RowTypeA" top={value} />}
    />
  );
}

const fmt = (v: number | null, unit: string) => (v === null ? "-" : `${v}${unit}`);

interface HomeProps {
  pointId: string | null;
  chips: ReactNode;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export function Home({ pointId, chips, favorites, onToggleFavorite }: HomeProps) {
  const { data: point, error, retry } = useApi<PointSummary>(pointId ? `/api/home/${pointId}` : null);
  const [detailOpen, setDetailOpen] = useState(false);

  if (error) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <p style={{ color: adaptive.grey600, marginBottom: 16 }}>정보를 불러오지 못했어요.</p>
        <Button size="medium" onClick={retry}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (!point) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <Loader size="medium" />
      </div>
    );
  }

  const signal = SIGNAL_STYLE[point.signal.level];
  const { tide, now } = point;

  return (
    <div>
      {chips}

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
        onClick={() => setDetailOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setDetailOpen(true)}
        style={{
          margin: "16px 24px",
          padding: 20,
          borderRadius: 20,
          backgroundColor: signal.bg,
          cursor: "pointer",
        }}
        aria-label="출조 신호등 — 눌러서 상세 보기"
      >
        <Badge variant="fill" color={signal.badgeColor} size="medium">
          {signal.label}
        </Badge>
        <p style={{ margin: "10px 0 0", fontSize: 19, fontWeight: 700, color: signal.fg }}>{point.signal.reason}</p>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: adaptive.grey500 }}>조위 곡선·시간대별 예보 보기 ›</p>
      </section>

      {detailOpen && pointId && (
        <Detail
          pointId={pointId}
          favorite={favorites.includes(pointId)}
          onToggleFavorite={() => onToggleFavorite(pointId)}
          onClose={() => setDetailOpen(false)}
        />
      )}

      <InfoRow label="만조" value={tide.highs.join(" · ") || "-"} />
      <InfoRow label="간조" value={tide.lows.join(" · ") || "-"} />
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
        본 정보는 참고용이에요. 출조 전 기상특보를 꼭 확인하세요.
      </p>
    </div>
  );
}
