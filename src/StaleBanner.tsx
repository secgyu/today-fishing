import { adaptive } from "@toss/tds-colors";

export function StaleBanner({ staleAt }: { staleAt: number | null }) {
  if (staleAt === null) return null;
  const d = new Date(staleAt);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const day = d.toDateString() === new Date().toDateString() ? "오늘" : `${d.getMonth() + 1}/${d.getDate()}`;
  return (
    <div
      role="status"
      style={{
        margin: "12px 24px 0",
        padding: "10px 16px",
        borderRadius: 12,
        backgroundColor: adaptive.greyOpacity100,
        color: adaptive.grey700,
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      연결이 안 돼요 — {day} {hh}:{mm}에 받은 정보예요
    </div>
  );
}
