import { adaptive } from "@toss/tds-colors";

export type TabId = "home" | "map" | "tide";

const TABS: { id: TabId; label: string; icon: (active: boolean) => JSX.Element }[] = [
  {
    id: "home",
    label: "홈",
    icon: (active) => (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      >
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5z" />
      </svg>
    ),
  },
  {
    id: "map",
    label: "지도",
    icon: (active) => (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      >
        <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" fill={active ? "var(--tabbar-bg, #fff)" : "none"} />
      </svg>
    ),
  },
  {
    id: "tide",
    label: "물때표",
    icon: (active) => (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 3v4M16 3v4" />
        <path
          d="M7 15c1.5-1.5 3.5-1.5 5 0s3.5 1.5 5 0"
          stroke={active ? "var(--tabbar-bg, #fff)" : "currentColor"}
          fill="none"
        />
      </svg>
    ),
  },
];

interface TabBarProps {
  current: TabId;
  onChange: (tab: TabId) => void;
}

export function TabBar({ current, onChange }: TabBarProps) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        borderTop: `0.5px solid ${adaptive.grey200}`,
        backgroundColor: adaptive.background,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="주요 메뉴"
    >
      {TABS.map(({ id, label, icon }) => {
        const active = id === current;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "8px 0 6px",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: active ? adaptive.blue500 : adaptive.grey500,
              transition: "color 0.15s ease",
            }}
          >
            {icon(active)}
            <span style={{ fontSize: "0.6875rem", fontWeight: active ? 600 : 400 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
