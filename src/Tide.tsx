import { adaptive } from "@toss/tds-colors";
import { Badge, Button, ListFooter, ListRow, Loader } from "@toss/tds-mobile";
import { useState, type ReactNode } from "react";
import { useApi, type TideDay, type TidePoint } from "./api";
import { LoadingPill, StaleBanner } from "./StaleBanner";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_DAYS = 28;

function dayColor(dow: number, isToday: boolean): string | undefined {
  if (isToday) return adaptive.blue500;
  if (dow === 0) return adaptive.red500;
  if (dow === 6) return adaptive.blue500;
  return undefined;
}

function tideLine(label: string, points: TidePoint[]): string {
  if (points.length === 0) return `${label} -`;
  return `${label} ${points.map((p) => `${p.time} (${p.level}cm)`).join(" · ")}`;
}

interface TideProps {
  pointId: string | null;
  chips: ReactNode;
}

export function Tide({ pointId, chips }: TideProps) {
  const [days, setDays] = useState(7);
  const { data, error, staleAt, loading, retry } = useApi<TideDay[]>(
    pointId ? `/api/tide/${pointId}?days=${days}` : null,
  );

  if (error) {
    return (
      <div>
        {chips}
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ color: adaptive.grey600, marginBottom: 16 }}>물때 정보를 불러오지 못했어요.</p>
          <Button size="medium" onClick={retry}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <Loader size="medium" />
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* 포인트 전환·더 보기 등 갱신 중 — 기존 내용 위에 스피너만 */}
      <LoadingPill show={loading} />

      {chips}

      <StaleBanner staleAt={staleAt} />

      {data.map((day, i) => {
        const isToday = i === 0;
        const d = new Date(`${day.date}T00:00:00`);
        const dow = d.getDay();
        // 조금·무시 = 물흐름 약한 날 — 출조일 계획에서 구분되도록 회색 처리
        const slackDay = day.mul === "조금" || day.mul === "무시";
        const label = isToday ? "오늘" : `${d.getMonth() + 1}.${d.getDate()} (${WEEKDAYS[dow]})`;

        return (
          <ListRow
            key={day.date}
            as="div"
            verticalPadding="medium"
            left={
              <span style={{ fontSize: 28 }} role="img" aria-label="월령">
                {day.moon}
              </span>
            }
            contents={
              <ListRow.Texts
                type="3RowTypeA"
                top={<span style={{ fontWeight: isToday ? 700 : 600, color: dayColor(dow, isToday) }}>{label}</span>}
                middle={tideLine("만조", day.highs)}
                bottom={tideLine("간조", day.lows)}
              />
            }
            right={
              <Badge variant={isToday ? "fill" : "weak"} color={slackDay ? "elephant" : "blue"} size="small">
                {day.mul}
              </Badge>
            }
          />
        );
      })}

      {days < MAX_DAYS && (
        <ListFooter onClick={() => setDays((d) => Math.min(d + 7, MAX_DAYS))} style={{ cursor: "pointer" }}>
          7일 더 보기
        </ListFooter>
      )}

      <p style={{ margin: "20px 24px 16px", fontSize: 12, color: adaptive.grey500, textAlign: "center" }}>
        갯바위·방파제 등 연안 기준이에요. 본 정보는 참고용이에요. 출조 전 기상특보를 꼭 확인하세요.
      </p>
    </div>
  );
}
