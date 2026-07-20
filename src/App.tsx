import { adaptive } from "@toss/tds-colors";
import { Chip, ChipItem, Top } from "@toss/tds-mobile";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApi, type PointInfo } from "./api";
import "./App.css";
import { getFavorites, MAX_FAVORITES, toggleFavorite } from "./favorites";
import { Home } from "./Home";
import { getMyLocation, nearestPoint, sortByDistance, type LatLng } from "./location";
import { MapTab } from "./Map";
import { PointSearch } from "./PointSearch";
import { Splash } from "./Splash";
import { TabBar, type TabId } from "./TabBar";
import { Tide } from "./Tide";
import { Toast } from "./Toast";

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
  const [locReady, setLocReady] = useState(false); // 위치 시도 끝 — 거부/실패면 검색 유도
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    getMyLocation().then((loc) => {
      setMyLoc(loc);
      setLocReady(true);
    });
  }, []);

  // 지도 "내 위치" 버튼: 거부 상태였어도 권한 재요청
  const locate = async () => {
    const loc = await getMyLocation(true);
    setLocReady(true);
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

  // 칩: 즐겨찾기 먼저 + 가까운 순 상위 몇 개만 (전국 62곳 전부는 과함) + 현재 선택 지점 보장
  const orderedPoints = useMemo(() => {
    if (!points) return null;
    const favs = points.filter((p) => favorites.includes(p.id));
    const rest = (myLoc ? sortByDistance(points, myLoc) : points).filter((p) => !favorites.includes(p.id));
    const list = [...favs, ...rest].slice(0, Math.max(8, favs.length + 3));
    const selected = pointId && points.find((p) => p.id === pointId);
    if (selected && !list.some((p) => p.id === selected.id)) list.push(selected);
    return list;
  }, [points, favorites, myLoc, pointId]);

  const chips = (
    <>
      <PointSearch points={points} favorites={favorites} onSelect={setSelectedId} />
      {locReady && !myLoc && (
        <div
          role="status"
          style={{
            margin: "4px 16px 8px",
            padding: "12px 16px",
            borderRadius: 12,
            backgroundColor: adaptive.blue50,
            color: adaptive.blue600,
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          위치를 쓸 수 없어요. 위 검색으로 포인트를 골라보세요.
        </div>
      )}
      {orderedPoints && (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <Chip kind="select" size="small" style={{ flexWrap: "nowrap", width: "max-content" }}>
            {orderedPoints.map((p) => (
              <ChipItem key={p.id} selected={p.id === pointId} onClick={() => setSelectedId(p.id)}>
                {favorites.includes(p.id) ? `★ ${p.name}` : p.name}
              </ChipItem>
            ))}
          </Chip>
        </div>
      )}
    </>
  );

  const onToggleFavorite = (id: string) => {
    const { favorites: next, blocked } = toggleFavorite(id);
    setFavorites(next);
    if (blocked) setToast(`즐겨찾기는 최대 ${MAX_FAVORITES}개까지예요`);
  };

  return (
    <>
      <Splash ready={points !== null || pointsError} />
      <Toast message={toast} onDone={clearToast} />
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
