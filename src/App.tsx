import { Top } from "@toss/tds-mobile";
import { useState } from "react";
import "./App.css";
import { Home } from "./Home";
import { Splash } from "./Splash";
import { TabBar, type TabId } from "./TabBar";

const SCREENS: Record<TabId, { title: string; subtitle: string }> = {
  home: { title: "오늘출조", subtitle: "오늘 출조해도 될까요?" },
  map: { title: "지도", subtitle: "포인트를 탐색해 보세요." },
  tide: { title: "물때표", subtitle: "출조일을 계획해 보세요." },
};

function App() {
  const [tab, setTab] = useState<TabId>("home");
  const screen = SCREENS[tab];

  return (
    <>
      {/* ponytail: ready 고정 true — 홈 데이터 fetch 붙이면 그 완료 여부로 교체 */}
      <Splash ready />

      {/* 탭바 높이만큼 하단 여백 확보 */}
      <main style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
        <Top
          title={<Top.TitleParagraph size={22}>{screen.title}</Top.TitleParagraph>}
          subtitleBottom={<Top.SubtitleParagraph size={17}>{screen.subtitle}</Top.SubtitleParagraph>}
        />
        {tab === "home" && <Home />}
      </main>

      <TabBar current={tab} onChange={setTab} />
    </>
  );
}

export default App;
