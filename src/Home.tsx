import { adaptive } from "@toss/tds-colors";
import { Badge, Button, ListRow, Loader } from "@toss/tds-mobile";
import { useState, type ReactNode } from "react";
import { useApi, type PointInfo, type PointSummary, type SignalLevel } from "./api";
import { Detail } from "./Detail";
import { FavIcon } from "./FavIcon";
import type { LatLng } from "./location";
import { FAR_KM, displaySignalLevel, distKm, formatDistLabel, type Gubun, type Slot } from "./safety";
import { LoadingPill, StaleBanner } from "./StaleBanner";

/** rem — 토스 큰 글씨 모드에서 루트 스케일 따라감 */
const fs = {
  xs: "0.75rem",
  sm: "0.8125rem",
  md: "0.875rem",
  lg: "0.9375rem",
  xl: "1.125rem",
  hero: "1.5rem",
} as const;

const SIGNAL_STYLE: Record<
  SignalLevel,
  { label: string; badgeColor: "green" | "yellow" | "red" | "grey"; bg: string; fg: string }
> = {
  green: { label: "출조 좋음", badgeColor: "green", bg: adaptive.green50, fg: adaptive.green600 },
  yellow: { label: "주의", badgeColor: "yellow", bg: adaptive.yellow50, fg: adaptive.yellow600 },
  red: { label: "비추천", badgeColor: "red", bg: adaptive.red50, fg: adaptive.red600 },
  unknown: { label: "판단 불가", badgeColor: "grey", bg: adaptive.greyOpacity100, fg: adaptive.grey700 },
};

function InfoRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <ListRow
      as="div"
      verticalPadding="small"
      contents={<ListRow.Texts type="1RowTypeA" top={label} />}
      right={
        <span style={{ fontSize: big ? fs.xl : fs.md, fontWeight: big ? 700 : 500, color: adaptive.grey800 }}>
          {value}
        </span>
      }
    />
  );
}

const fmt = (v: number | null, unit: string) => (v === null ? "-" : `${v}${unit}`);

const GUBUN_LABEL: Record<Gubun, string> = { 갯바위: "갯바위·방파제", 선상: "선상" };
const GUBUN_SHORT: Record<Gubun, string> = { 갯바위: "갯바위", 선상: "선상" };

/** 형태 + 시간대 한 줄 — 신호등까지 스크롤 줄임 */
function ModeBar({
  gubun,
  slot,
  onGubun,
  onSlot,
}: {
  gubun: Gubun | null;
  slot: Slot;
  onGubun: (g: Gubun) => void;
  onSlot: (s: Slot) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        margin: "8px 16px 0",
        alignItems: "stretch",
      }}
    >
      <div
        role="radiogroup"
        aria-label="낚시 형태"
        style={{
          flex: 1.2,
          display: "flex",
          padding: 3,
          borderRadius: 10,
          backgroundColor: adaptive.greyOpacity100,
        }}
      >
        {(Object.keys(GUBUN_SHORT) as Gubun[]).map((g) => (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={gubun === g}
            onClick={() => onGubun(g)}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 8,
              padding: "8px 0",
              fontSize: fs.sm,
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: gubun === g ? adaptive.background : "transparent",
              color: gubun === g ? adaptive.grey800 : adaptive.grey500,
              boxShadow: gubun === g ? "0 1px 3px rgba(0,0,0,.12)" : "none",
            }}
          >
            {GUBUN_SHORT[g]}
          </button>
        ))}
      </div>
      <div
        role="radiogroup"
        aria-label="출조 시간대"
        style={{
          flex: 1,
          display: "flex",
          padding: 3,
          borderRadius: 10,
          backgroundColor: adaptive.greyOpacity100,
        }}
      >
        {(["오전", "오후"] as Slot[]).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={slot === s}
            onClick={() => onSlot(s)}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 8,
              padding: "8px 0",
              fontSize: fs.sm,
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: slot === s ? adaptive.blue50 : "transparent",
              color: slot === s ? adaptive.blue600 : adaptive.grey500,
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function GateCard({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      style={{
        margin: "16px 16px 0",
        padding: "16px",
        borderRadius: 16,
        backgroundColor: adaptive.blue50,
        color: adaptive.blue600,
        fontSize: fs.lg,
        fontWeight: 700,
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  );
}

interface HomeProps {
  pointId: string | null;
  pointInfo: PointInfo | null;
  myLoc: LatLng | null;
  needsPoint: boolean;
  gubun: Gubun | null;
  slot: Slot;
  onGubun: (g: Gubun) => void;
  onSlot: (s: Slot) => void;
  chips: ReactNode;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export function Home({
  pointId,
  pointInfo,
  myLoc,
  needsPoint,
  gubun,
  slot,
  onGubun,
  onSlot,
  chips,
  favorites,
  onToggleFavorite,
}: HomeProps) {
  const path =
    pointId && gubun
      ? `/api/home/${pointId}?gubun=${encodeURIComponent(gubun)}&slot=${encodeURIComponent(slot)}`
      : null;
  const { data: point, error, staleAt, loading, retry } = useApi<PointSummary>(path);
  const [detailOpen, setDetailOpen] = useState(false);

  const km = myLoc && pointInfo ? distKm(myLoc, pointInfo) : null;
  const far = km !== null && km > FAR_KM;

  if (needsPoint) {
    return (
      <div>
        {chips}
        <GateCard>
          어디로 나갈지 골라주세요.
          <span style={{ display: "block", marginTop: 6, fontWeight: 600, fontSize: fs.md, opacity: 0.9 }}>
            위 검색이나 추천 칩을 탭하면 바로 판단해요.
          </span>
        </GateCard>
      </div>
    );
  }

  if (!gubun) {
    return (
      <div>
        {chips}
        <GateCard>
          어디서 낚시하세요?
          <span style={{ display: "block", marginTop: 6, fontWeight: 600, fontSize: fs.md, opacity: 0.9 }}>
            갯바위·방파제와 선상은 판단 기준이 달라요. 고르면 바로 보여줘요.
          </span>
        </GateCard>
        <ModeBar gubun={null} slot={slot} onGubun={onGubun} onSlot={onSlot} />
      </div>
    );
  }

  const modeBar = <ModeBar gubun={gubun} slot={slot} onGubun={onGubun} onSlot={onSlot} />;

  if (error) {
    return (
      <div>
        {chips}
        {modeBar}
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ color: adaptive.grey600, marginBottom: 16, fontSize: fs.lg }}>정보를 불러오지 못했어요.</p>
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
        {modeBar}
        <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
          <Loader size="medium" />
        </div>
      </div>
    );
  }

  const level = displaySignalLevel(point.signal.level, {
    stale: staleAt !== null,
    warningUnavailable: point.warningUnavailable,
    loading,
  });
  const signal = SIGNAL_STYLE[level];
  const { tide, now } = point;
  const reasonParts = point.signal.reason.split(" · ");
  const reasonBody = loading
    ? "새 기준으로 불러오는 중이에요."
    : level === "unknown"
      ? staleAt !== null
        ? "연결이 끊겨 예전 정보예요. 출조 여부는 판단하지 않아요."
        : point.signal.reason.includes("판단 불가")
          ? reasonParts.slice(1).join(" · ") || point.signal.reason
          : "지금은 출조 여부를 판단할 수 없어요."
      : reasonParts.length > 1
        ? reasonParts.slice(1).join(" · ")
        : point.signal.reason;

  const badgeColor = signal.badgeColor === "grey" ? undefined : signal.badgeColor;
  const badgeLabel = loading ? "불러오는 중" : signal.label;

  return (
    <div style={{ position: "relative" }}>
      <LoadingPill show={loading} />

      {chips}
      {modeBar}

      {/* 특보만 신호등 위 — 나머지 안내는 카드 안/아래로 몰아 스크롤 줄임 */}
      {point.warningUnavailable && (
        <div
          role="alert"
          style={{
            margin: "8px 16px 0",
            padding: "10px 14px",
            borderRadius: 12,
            backgroundColor: adaptive.yellow50,
            color: adaptive.yellow700,
            fontSize: fs.sm,
            fontWeight: 600,
          }}
        >
          기상특보를 확인하지 못했어요. 출조 전 기상청 특보를 직접 확인하세요.
        </div>
      )}
      {point.warning && (
        <div
          role="alert"
          style={{
            margin: "8px 16px 0",
            padding: "10px 14px",
            borderRadius: 12,
            backgroundColor: adaptive.red50,
            color: adaptive.red600,
            fontSize: fs.sm,
            fontWeight: 600,
          }}
        >
          {point.warning}
        </div>
      )}

      <section
        style={{
          margin: "10px 16px 0",
          padding: 18,
          borderRadius: 20,
          backgroundColor: signal.bg,
          opacity: loading ? 0.85 : 1,
        }}
        aria-label="출조 신호등"
        aria-busy={loading}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 2,
          }}
        >
          <p style={{ margin: 0, fontSize: fs.md, fontWeight: 700, color: adaptive.grey700 }}>
            {point.name}
            {km !== null ? ` · ${formatDistLabel(km)}` : ""}
          </p>
          {pointId && (
            <button
              type="button"
              onClick={() => onToggleFavorite(pointId)}
              aria-label={favorites.includes(pointId) ? "즐겨찾기 해제" : "즐겨찾기 추가"}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                padding: 4,
                color: favorites.includes(pointId) ? "#e5a800" : adaptive.grey500,
                flexShrink: 0,
              }}
            >
              <FavIcon on={favorites.includes(pointId)} size={22} />
            </button>
          )}
        </div>
        <p style={{ margin: "0 0 10px", fontSize: fs.xs, fontWeight: 600, color: adaptive.grey500 }}>
          {GUBUN_LABEL[gubun]} · {slot} · {point.asOf} 갱신
          {far ? ` · ${Math.round(km!)}km` : ""}
        </p>
        {badgeColor ? (
          <Badge variant="fill" color={badgeColor} size="medium">
            {badgeLabel}
          </Badge>
        ) : (
          <span
            style={{
              display: "inline-block",
              padding: "4px 10px",
              borderRadius: 8,
              backgroundColor: adaptive.grey200,
              color: adaptive.grey700,
              fontSize: fs.sm,
              fontWeight: 700,
            }}
          >
            {badgeLabel}
          </span>
        )}
        <p style={{ margin: "10px 0 0", fontSize: fs.hero, fontWeight: 700, color: signal.fg, lineHeight: 1.3 }}>
          {reasonBody}
        </p>
        {!loading && (
          <div style={{ marginTop: 14 }}>
            <Button size="medium" display="block" onClick={() => setDetailOpen(true)}>
              {level === "unknown" ? "만조·예보 숫자만 보기" : "조위 곡선 · 시간대별 예보 보기"}
            </Button>
          </div>
        )}
      </section>

      <StaleBanner staleAt={staleAt} />

      {far && !loading && (
        <p
          role="status"
          style={{
            margin: "8px 16px 0",
            fontSize: fs.sm,
            fontWeight: 600,
            color: adaptive.yellow700,
            lineHeight: 1.4,
          }}
        >
          내 위치에서 멀어요. 다른 바다 판단일 수 있으니 포인트를 확인하세요.
        </p>
      )}

      {detailOpen && pointId && (
        <Detail
          pointId={pointId}
          favorite={favorites.includes(pointId)}
          onToggleFavorite={() => onToggleFavorite(pointId)}
          onClose={() => setDetailOpen(false)}
        />
      )}

      <p style={{ margin: "14px 16px 0", fontSize: fs.sm, fontWeight: 700, color: adaptive.grey500 }}>
        오늘 현장 · {point.asOf} 갱신
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
          margin: "16px 16px 16px",
          fontSize: fs.xs,
          color: adaptive.grey500,
          textAlign: "center",
          lineHeight: 1.45,
        }}
      >
        현장 숫자는 지점 공통이에요. 위 토글은 출조 판단만 바꿔요. 참고용 — 출조 전 기상특보를 확인하세요.
      </p>
    </div>
  );
}
