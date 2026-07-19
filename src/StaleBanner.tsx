import { adaptive } from "@toss/tds-colors";
import { Loader } from "@toss/tds-mobile";

/** 데이터 갱신 중 상단에 떠 있는 스피너 알약 — 기존 내용은 그대로 보이게 */
export function LoadingPill({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="status"
      aria-label="불러오는 중"
      style={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1500,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: 20,
        backgroundColor: adaptive.background,
        boxShadow: "0 2px 10px rgba(0,0,0,.25)",
        fontSize: 14,
        fontWeight: 600,
        color: adaptive.grey700,
        whiteSpace: "nowrap",
      }}
    >
      <Loader size="small" />
      불러오는 중
    </div>
  );
}

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
