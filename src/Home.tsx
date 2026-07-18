import { adaptive } from "@toss/tds-colors";
import { Badge, Chip, ChipItem, ListRow } from "@toss/tds-mobile";
import { useState } from "react";

/** 백엔드(Workers) 응답과 동일한 형태. fetch 붙일 때 이 타입 그대로 사용. */
export type SignalLevel = "green" | "yellow" | "red";

export interface PointSummary {
  id: string;
  name: string;
  signal: { level: SignalLevel; reason: string };
  warning: string | null;
  tide: { highs: string[]; lows: string[]; mul: string; moon: string };
  now: {
    waveHeight: number;
    windDir: string;
    windSpeed: number;
    weather: string;
    airTemp: number;
    waterTemp: number;
  };
}

// ponytail: 목데이터 — 백엔드 프록시 완성 시 fetch로 교체
const MOCK_POINTS: PointSummary[] = [
  {
    id: "incheon",
    name: "인천",
    signal: { level: "green", reason: "출조하기 좋아요 · 7물 · 파고 낮음" },
    warning: null,
    tide: { highs: ["04:32", "17:11"], lows: ["10:58", "23:20"], mul: "7물", moon: "상현" },
    now: { waveHeight: 0.3, windDir: "북서", windSpeed: 3.2, weather: "맑음", airTemp: 27, waterTemp: 22 },
  },
  {
    id: "bangamori",
    name: "안산 방아머리",
    signal: { level: "yellow", reason: "주의 · 오후부터 풍속 8m/s" },
    warning: null,
    tide: { highs: ["05:01", "17:40"], lows: ["11:25", "23:48"], mul: "7물", moon: "상현" },
    now: { waveHeight: 0.6, windDir: "남서", windSpeed: 6.8, weather: "구름많음", airTemp: 26, waterTemp: 21 },
  },
  {
    id: "bieung",
    name: "군산 비응항",
    signal: { level: "red", reason: "출조 비추천 · 풍랑주의보 발효 중" },
    warning: "풍랑주의보 발효 중 · 서해중부앞바다",
    tide: { highs: ["05:44", "18:19"], lows: ["12:02", "-"], mul: "7물", moon: "상현" },
    now: { waveHeight: 1.8, windDir: "북서", windSpeed: 11.5, weather: "흐림", airTemp: 24, waterTemp: 20 },
  },
];

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

export function Home() {
  const [pointId, setPointId] = useState(MOCK_POINTS[0].id);
  const point = MOCK_POINTS.find((p) => p.id === pointId) ?? MOCK_POINTS[0];
  const signal = SIGNAL_STYLE[point.signal.level];
  const { tide, now } = point;

  return (
    <div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <Chip kind="select" size="small" style={{ flexWrap: "nowrap", width: "max-content" }}>
          {MOCK_POINTS.map((p) => (
            <ChipItem key={p.id} selected={p.id === pointId} onClick={() => setPointId(p.id)}>
              {p.name}
            </ChipItem>
          ))}
        </Chip>
      </div>

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
        <p style={{ margin: "10px 0 0", fontSize: 19, fontWeight: 700, color: signal.fg }}>{point.signal.reason}</p>
      </section>

      <InfoRow label="만조" value={tide.highs.join(" · ")} />
      <InfoRow label="간조" value={tide.lows.join(" · ")} />
      <InfoRow label="물때 · 월령" value={`${tide.mul} · ${tide.moon}`} />
      <InfoRow label="파고" value={`${now.waveHeight}m`} />
      <InfoRow label="바람" value={`${now.windDir} ${now.windSpeed}m/s`} />
      <InfoRow label="날씨 · 기온" value={`${now.weather} · ${now.airTemp}°`} />
      <InfoRow label="수온" value={`${now.waterTemp}°`} />

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
