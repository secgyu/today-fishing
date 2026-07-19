import { Chip, ChipItem, Top } from "@toss/tds-mobile";
import { useEffect, useMemo, useState } from "react";
import { useApi, type PointInfo } from "./api";
import "./App.css";
import { getFavorites, toggleFavorite } from "./favorites";
import { Home } from "./Home";
import { getMyLocation, nearestPoint, type LatLng } from "./location";
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
  const [favorites, setFavorites] = useState<string[]>(getFavorites);
  const [myLoc, setMyLoc] = useState<LatLng | null>(null);

  useEffect(() => {
    getMyLocation().then(setMyLoc);
  }, []);

  // 지도 "내 위치" 버튼: 거부 상태였어도 권한 재요청
  const locate = async () => {
    const loc = await getMyLocation(true);
    if (loc) setMyLoc({ ...loc });
  };

  // 첫 진입: 사용자가 고르기 전이면 최근접 포인트 자동 선택 (기획서 §5.3)
  useEffect(() => {
    if (selectedId || !points || !myLoc) return;
    const nearest = nearestPoint(points, myLoc);
    if (nearest) setSelectedId(nearest.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, myLoc]);

  const screen = SCREENS[tab];
  const pointId = selectedId ?? points?.[0]?.id ?? null;

  // 즐겨찾기 먼저, 나머지는 원래 순서
  const orderedPoints = useMemo(() => {
    if (!points) return null;
    const rank = (p: PointInfo) => {
      const i = favorites.indexOf(p.id);
      return i === -1 ? favorites.length : i;
    };
    return [...points].sort((a, b) => rank(a) - rank(b));
  }, [points, favorites]);

  const chips = orderedPoints && (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <Chip kind="select" size="small" style={{ flexWrap: "nowrap", width: "max-content" }}>
        {orderedPoints.map((p) => (
          <ChipItem key={p.id} selected={p.id === pointId} onClick={() => setSelectedId(p.id)}>
            {favorites.includes(p.id) ? `★ ${p.name}` : p.name}
          </ChipItem>
        ))}
      </Chip>
    </div>
  );

  const onToggleFavorite = (id: string) => setFavorites(toggleFavorite(id));

  return (
    <>
      <Splash ready={points !== null || pointsError} />
      <main style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
        <Top
          title={<Top.TitleParagraph size={22}>{screen.title}</Top.TitleParagraph>}
          subtitleBottom={<Top.SubtitleParagraph size={17}>{screen.subtitle}</Top.SubtitleParagraph>}
        />
        {tab === "home" && (
          <Home pointId={pointId} chips={chips} favorites={favorites} onToggleFavorite={onToggleFavorite} />
        )}
        {tab === "map" && (
          <MapTab
            myLoc={myLoc}
            onLocate={locate}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
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
