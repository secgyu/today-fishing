import { adaptive } from "@toss/tds-colors";
import { Badge, Button, ListRow, Loader } from "@toss/tds-mobile";
import { useState, type ReactNode } from "react";
import { useApi, type PointInfo, type PointSummary, type SignalLevel } from "./api";
import { Detail } from "./Detail";
import type { LatLng } from "./location";
import {
  FAR_KM,
  defaultSlot,
  displaySignalLevel,
  distKm,
  formatDistLabel,
  needsGubunPick,
  type Gubun,
  type Slot,
} from "./safety";
import { LoadingPill, StaleBanner } from "./StaleBanner";

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
        <span style={{ fontSize: big ? 19 : 15, fontWeight: big ? 700 : 500, color: adaptive.grey800 }}>{value}</span>
      }
    />
  );
}

const fmt = (v: number | null, unit: string) => (v === null ? "-" : `${v}${unit}`);

const GUBUN_KEY = "gubun";
const GUBUN_LABEL: Record<Gubun, string> = { 갯바위: "갯바위·방파제", 선상: "선상(배)" };

function readGubun(): Gubun | null {
  const v = localStorage.getItem(GUBUN_KEY);
  return needsGubunPick(v) ? null : (v as Gubun);
}

/** 갯바위·방파제 / 선상 — 미선택이면 양쪽 다 눌러서 고르는 게이트 */
function GubunToggle({ value, onChange }: { value: Gubun | null; onChange: (g: Gubun) => void }) {
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

function SlotToggle({ value, onChange }: { value: Slot; onChange: (s: Slot) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="출조 시간대"
      style={{
        display: "flex",
        gap: 8,
        margin: "8px 24px 0",
      }}
    >
      {(["오전", "오후"] as Slot[]).map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          onClick={() => onChange(s)}
          style={{
            flex: 1,
            border: value === s ? `1.5px solid ${adaptive.blue500}` : "1.5px solid transparent",
            borderRadius: 10,
            padding: "8px 0",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            backgroundColor: value === s ? adaptive.blue50 : adaptive.greyOpacity100,
            color: value === s ? adaptive.blue600 : adaptive.grey600,
          }}
        >
          {s} 기준
        </button>
      ))}
    </div>
  );
}

interface HomeProps {
  pointId: string | null;
  pointInfo: PointInfo | null;
  myLoc: LatLng | null;
  needsPoint: boolean;
  chips: ReactNode;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export function Home({ pointId, pointInfo, myLoc, needsPoint, chips, favorites, onToggleFavorite }: HomeProps) {
  const [gubun, setGubun] = useState<Gubun | null>(readGubun);
  const [slot, setSlot] = useState<Slot>(() => defaultSlot(new Date().getHours()));
  const path =
    pointId && gubun
      ? `/api/home/${pointId}?gubun=${encodeURIComponent(gubun)}&slot=${encodeURIComponent(slot)}`
      : null;
  const { data: point, error, staleAt, loading, retry } = useApi<PointSummary>(path);
  const [detailOpen, setDetailOpen] = useState(false);

  const changeGubun = (g: Gubun) => {
    setGubun(g);
    localStorage.setItem(GUBUN_KEY, g);
  };

  const km = myLoc && pointInfo ? distKm(myLoc, pointInfo) : null;
  const far = km !== null && km > FAR_KM;

  if (needsPoint) {
    return (
      <div>
        {chips}
        <div
          role="status"
          style={{
            margin: "24px 24px 0",
            padding: "20px 16px",
            borderRadius: 16,
            backgroundColor: adaptive.blue50,
            color: adaptive.blue600,
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.4,
          }}
        >
          어디 포인트인지 먼저 골라주세요. 위치 없이 임의 지점으로 판단하지 않아요.
        </div>
      </div>
    );
  }

  if (!gubun) {
    return (
      <div>
        {chips}
        <div
          role="status"
          style={{
            margin: "16px 24px 0",
            padding: "16px",
            borderRadius: 16,
            backgroundColor: adaptive.greyOpacity100,
            fontSize: 15,
            fontWeight: 700,
            color: adaptive.grey700,
            lineHeight: 1.4,
          }}
        >
          낚시 형태를 고르면 출조 판단을 보여줘요. 연안(갯바위·방파제)과 선상은 기준이 달라요.
        </div>
        <GubunToggle value={null} onChange={changeGubun} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {chips}
        <GubunToggle value={gubun} onChange={changeGubun} />
        <SlotToggle value={slot} onChange={setSlot} />
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
        <SlotToggle value={slot} onChange={setSlot} />
        <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
          <Loader size="medium" />
        </div>
      </div>
    );
  }

  const level = displaySignalLevel(point.signal.level, {
    stale: staleAt !== null,
    warningUnavailable: point.warningUnavailable,
  });
  const signal = SIGNAL_STYLE[level];
  const { tide, now } = point;
  const reasonParts = point.signal.reason.split(" · ");
  const reasonBody =
    level === "unknown"
      ? staleAt !== null
        ? "연결이 끊겨 예전 정보예요. 출조 여부는 판단하지 않아요."
        : point.signal.reason.includes("판단 불가")
          ? reasonParts.slice(1).join(" · ") || point.signal.reason
          : "지금은 출조 여부를 판단할 수 없어요."
      : reasonParts.length > 1
        ? reasonParts.slice(1).join(" · ")
        : point.signal.reason;

  const badgeColor = signal.badgeColor === "grey" ? undefined : signal.badgeColor;

  return (
    <div style={{ position: "relative" }}>
      <LoadingPill show={loading} />

      {chips}

      <GubunToggle value={gubun} onChange={changeGubun} />
      <SlotToggle value={slot} onChange={setSlot} />

      <StaleBanner staleAt={staleAt} />

      {far && (
        <div
          role="status"
          style={{
            margin: "12px 24px 0",
            padding: "10px 16px",
            borderRadius: 12,
            backgroundColor: adaptive.yellow50,
            color: adaptive.yellow700,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          내 위치에서 {Math.round(km!)}km예요. 다른 바다 판단일 수 있으니 포인트를 확인하세요.
        </div>
      )}

      {point.warningUnavailable && (
        <div
          role="alert"
          style={{
            margin: "12px 24px 0",
            padding: "12px 16px",
            borderRadius: 12,
            backgroundColor: adaptive.yellow50,
            color: adaptive.yellow700,
            fontSize: 14,
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
        <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: adaptive.grey600 }}>
          {point.name}
          {km !== null ? ` · ${formatDistLabel(km)}` : ""}
        </p>
        <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: adaptive.grey500 }}>
          {GUBUN_LABEL[gubun]} · {slot} 기준 · {point.asOf} 기준
        </p>
        {badgeColor ? (
          <Badge variant="fill" color={badgeColor} size="medium">
            {signal.label}
          </Badge>
        ) : (
          <span
            style={{
              display: "inline-block",
              padding: "4px 10px",
              borderRadius: 8,
              backgroundColor: adaptive.grey200,
              color: adaptive.grey700,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {signal.label}
          </span>
        )}
        <p style={{ margin: "12px 0 0", fontSize: 24, fontWeight: 700, color: signal.fg, lineHeight: 1.3 }}>
          {reasonBody}
        </p>
        {level !== "unknown" && (
          <div style={{ marginTop: 16 }}>
            <Button size="medium" display="block" onClick={() => setDetailOpen(true)}>
              조위 곡선 · 시간대별 예보 보기
            </Button>
          </div>
        )}
        {level === "unknown" && (
          <div style={{ marginTop: 16 }}>
            <Button size="medium" display="block" onClick={() => setDetailOpen(true)}>
              만조·예보 숫자만 보기
            </Button>
          </div>
        )}
      </section>

      {detailOpen && pointId && (
        <Detail
          pointId={pointId}
          favorite={favorites.includes(pointId)}
          onToggleFavorite={() => onToggleFavorite(pointId)}
          onClose={() => setDetailOpen(false)}
        />
      )}

      <p style={{ margin: "8px 24px 0", fontSize: 13, fontWeight: 700, color: adaptive.grey500 }}>
        오늘 현장 (지점 공통 · {point.asOf} 기준)
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
        위 현장 정보는 같은 지점이라 토글해도 같아요. 토글은 출조 신호등(연안/선상·오전/오후)만 바꿔요. 본 정보는
        참고용이에요. 출조 전 기상특보를 꼭 확인하세요.
      </p>
    </div>
  );
}
