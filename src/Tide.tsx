import { adaptive } from "@toss/tds-colors";
import { Badge, ListRow } from "@toss/tds-mobile";

/** 백엔드 응답과 동일한 형태. fetch 붙일 때 이 타입 그대로 사용. */
export interface TideDay {
  date: string; // yyyy-MM-dd
  mul: string;
  moon: string; // 월령 아이콘
  highs: string[];
  lows: string[];
}

const MULS = ["7물", "8물", "9물", "10물", "11물", "조금", "무시", "1물"];
const MOONS = ["🌔", "🌔", "🌕", "🌕", "🌖", "🌖", "🌗", "🌗"];

// ponytail: 목데이터 생성 — 조석 주기(약 50분/일 지연) 흉내만 냄. 백엔드 붙으면 삭제
function mockWeek(): TideDay[] {
  const baseHigh = 4 * 60 + 32; // 04:32
  const baseLow = 10 * 60 + 58; // 10:58
  const fmt = (min: number) => {
    const m = ((min % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const shift = i * 50;
    // 로컬(KST) 기준 날짜 — toISOString은 UTC라 새벽에 하루 밀림
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      date,
      mul: MULS[i % MULS.length],
      moon: MOONS[i % MOONS.length],
      highs: [fmt(baseHigh + shift), fmt(baseHigh + shift + 12 * 60 + 25)],
      lows: [fmt(baseLow + shift), fmt(baseLow + shift + 12 * 60 + 25)],
    };
  });
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function dayLabel(dateStr: string, isToday: boolean): string {
  const d = new Date(dateStr);
  return isToday ? "오늘" : `${d.getMonth() + 1}.${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}

export function Tide() {
  const week = mockWeek();

  return (
    <div>
      {week.map((day, i) => {
        const isToday = i === 0;
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
                type="2RowTypeA"
                top={
                  <span style={{ fontWeight: isToday ? 700 : 600, color: isToday ? adaptive.blue500 : undefined }}>
                    {dayLabel(day.date, isToday)}
                  </span>
                }
                bottom={`만조 ${day.highs.join(" · ")} / 간조 ${day.lows.join(" · ")}`}
              />
            }
            right={
              <Badge variant={isToday ? "fill" : "weak"} color="blue" size="small">
                {day.mul}
              </Badge>
            }
          />
        );
      })}

      <p style={{ margin: "20px 24px 16px", fontSize: 12, color: adaptive.grey500, textAlign: "center" }}>
        본 정보는 참고용이에요. 출조 전 기상특보를 꼭 확인하세요.
      </p>
    </div>
  );
}
