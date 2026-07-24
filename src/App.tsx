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
import { defaultSlot, needsGubunPick, needsPointPick, type Gubun, type Slot } from "./safety";
import { Splash } from "./Splash";
import { TabBar, type TabId } from "./TabBar";
import { Tide } from "./Tide";
import { FavIcon } from "./FavIcon";
import { Toast } from "./Toast";

const SCREENS: Record<TabId, { title: string; subtitle: string }> = {
  home: { title: "오늘출조", subtitle: "오늘 출조해도 될까요?" },
  map: { title: "지도", subtitle: "포인트를 탐색해 보세요." },
  tide: { title: "물때표", subtitle: "출조일을 계획해 보세요." },
};

const GUBUN_KEY = "gubun";

function readGubun(): Gubun | null {
  const v = localStorage.getItem(GUBUN_KEY);
  return needsGubunPick(v) ? null : (v as Gubun);
}

function App() {
  const [tab, setTab] = useState<TabId>("home");
  const { data: points, error: pointsError } = useApi<PointInfo[]>("/api/points");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userPicked, setUserPicked] = useState(false);
  const [gubun, setGubun] = useState<Gubun | null>(readGubun);
  const [slot, setSlot] = useState<Slot>(() => defaultSlot(new Date().getHours()));
  const [favorites, setFavorites] = useState<string[]>(getFavorites);
  const [myLoc, setMyLoc] = useState<LatLng | null>(null);
  const [locReady, setLocReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const pickPoint = useCallback((id: string) => {
    setSelectedId(id);
    setUserPicked(true);
  }, []);

  const onGubun = useCallback((g: Gubun) => {
    setGubun(g);
    localStorage.setItem(GUBUN_KEY, g);
  }, []);

  useEffect(() => {
    getMyLocation().then((loc) => {
      setMyLoc(loc);
      setLocReady(true);
    });
  }, []);

  const locate = async () => {
    const loc = await getMyLocation(true);
    setLocReady(true);
    if (loc) setMyLoc({ ...loc });
  };

  // 위치 있을 때만 최근접 자동 선택. 위치 없으면 points[0] 조용 폴백 금지.
  useEffect(() => {
    if (selectedId || !points || !myLoc) return;
    const nearest = nearestPoint(points, myLoc);
    if (nearest) setSelectedId(nearest.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, myLoc]);

  const forcePick = needsPointPick({ hasLocation: myLoc !== null, userPicked });
  const pointId = forcePick ? null : selectedId;
  const pointInfo = points?.find((p) => p.id === pointId) ?? null;

  const screen = SCREENS[tab];

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
      <PointSearch points={points} favorites={favorites} onSelect={pickPoint} />
      {locReady && !myLoc && (
        <div
          role="status"
          style={{
            margin: "4px 16px 8px",
            padding: "12px 16px",
            borderRadius: 12,
            backgroundColor: adaptive.blue50,
            color: adaptive.blue600,
            fontSize: "0.875rem",
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
              <ChipItem key={p.id} selected={p.id === pointId} onClick={() => pickPoint(p.id)}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {favorites.includes(p.id) && <FavIcon on size={12} />}
                  {p.name}
                </span>
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
      <main style={{ paddingBottom: "calc(76px + env(safe-area-inset-bottom))" }}>
        <Top
          title={<Top.TitleParagraph size={22}>{screen.title}</Top.TitleParagraph>}
          subtitleBottom={<Top.SubtitleParagraph size={17}>{screen.subtitle}</Top.SubtitleParagraph>}
        />
        {tab === "home" && (
          <Home
            pointId={pointId}
            pointInfo={pointInfo}
            myLoc={myLoc}
            needsPoint={forcePick}
            gubun={gubun}
            slot={slot}
            onGubun={onGubun}
            onSlot={setSlot}
            chips={chips}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
          />
        )}
        {tab === "map" && (
          <MapTab
            myLoc={myLoc}
            onLocate={locate}
            gubun={gubun ?? "갯바위"}
            slot={slot}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            onGoHome={(id) => {
              pickPoint(id);
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
