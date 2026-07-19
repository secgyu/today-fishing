import { Chip, ChipItem, Top } from "@toss/tds-mobile";
import { useState } from "react";
import { useApi, type PointInfo } from "./api";
import "./App.css";
import { Home } from "./Home";
import { MapTab } from "./Map";
import { Splash } from "./Splash";
import { TabBar, type TabId } from "./TabBar";
import { Tide } from "./Tide";

const SCREENS: Record<TabId, { title: string; subtitle: string }> = {
  home: { title: "오늘출조", subtitle: "오늘 출조해도 될까요?" },
  map: { title: "지도", subtitle: "포인트를 탐색해 보세요." },
  tide: { title: "물때표", subtitle: "출조일을 계획해 보세요." },
};

function App() {
  const [tab, setTab] = useState<TabId>("home");
  const { data: points, error: pointsError } = useApi<PointInfo[]>("/api/points");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const screen = SCREENS[tab];
  const pointId = selectedId ?? points?.[0]?.id ?? null;

  const chips = points && (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <Chip kind="select" size="small" style={{ flexWrap: "nowrap", width: "max-content" }}>
        {points.map((p) => (
          <ChipItem key={p.id} selected={p.id === pointId} onClick={() => setSelectedId(p.id)}>
            {p.name}
          </ChipItem>
        ))}
      </Chip>
    </div>
  );

  return (
    <>
      <Splash ready={points !== null || pointsError} />
      <main style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
        <Top
          title={<Top.TitleParagraph size={22}>{screen.title}</Top.TitleParagraph>}
          subtitleBottom={<Top.SubtitleParagraph size={17}>{screen.subtitle}</Top.SubtitleParagraph>}
        />
        {tab === "home" && <Home pointId={pointId} chips={chips} />}
        {tab === "map" && (
          <MapTab
            onGoHome={(id) => {
              setSelectedId(id);
              setTab("home");
            }}
          />
        )}
        {tab === "tide" && <Tide pointId={pointId} chips={chips} />}
      </main>
      <TabBar current={tab} onChange={setTab} />
    </>
  );
}

export default App;
