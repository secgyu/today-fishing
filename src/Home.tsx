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

interface HomeProps {
  pointId: string | null;
  chips: ReactNode;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export function Home({ pointId, chips, favorites, onToggleFavorite }: HomeProps) {
  const { data: point, error, staleAt, loading, retry } = useApi<PointSummary>(pointId ? `/api/home/${pointId}` : null);
  const [detailOpen, setDetailOpen] = useState(false);

  if (error) {
    return (
      <div>
        {chips}
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
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <Loader size="medium" />
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
      {/* 포인트 전환 등 갱신 중 — 기존 내용 위에 스피너만 */}
      <LoadingPill show={loading} />

      {chips}

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
        본 정보는 참고용이에요. 출조 전 기상특보를 꼭 확인하세요.
      </p>
    </div>
  );
}
