import { adaptive } from "@toss/tds-colors";
import { useEffect } from "react";

/** 짧은 하단 알림 — TDS Overlay 없이 로컬 상태만으로 동작 */
export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: "calc(72px + env(safe-area-inset-bottom))",
        zIndex: 3000,
        padding: "14px 18px",
        borderRadius: 14,
        backgroundColor: adaptive.grey800,
        color: adaptive.background,
        fontSize: 15,
        fontWeight: 600,
        textAlign: "center",
        boxShadow: "0 4px 16px rgba(0,0,0,.25)",
      }}
    >
      {message}
    </div>
  );
}
