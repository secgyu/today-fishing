import { useEffect, useState } from "react";
import "./Splash.css";

const MIN_SHOW_MS = 1600;
const FADE_MS = 400;
/** granite.config brand.icon과 동일 — 콘솔 앱 로고(라이트) */
const BRAND_ICON = "https://static.toss.im/appsintoss/45211/a2fcea0d-ac86-4cf5-ab9c-c4bdd3c4c270.png";

interface SplashProps {
  ready?: boolean;
  onDone?: () => void;
}

export function Splash({ ready = true, onDone }: SplashProps) {
  const [minElapsed, setMinElapsed] = useState(false);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_SHOW_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!(ready && minElapsed) || fading) return;
    setFading(true);
    const t = setTimeout(() => {
      setGone(true);
      onDone?.();
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [ready, minElapsed, fading, onDone]);

  if (gone) return null;

  return (
    <div className={`splash${fading ? " splash--fade" : ""}`} role="status" aria-label="오늘출조 로딩 중">
      <div className="splash__brand">
        <div className="splash__logo-wrap">
          <img className="splash__logo" src={BRAND_ICON} alt="" width={104} height={104} decoding="async" />
        </div>
        <h1 className="splash__title">오늘출조</h1>
        <p className="splash__tagline">10초 안에 오늘 출조 판단</p>
      </div>

      <p className="splash__safety">본 정보는 참고용이에요. 출조 전 기상특보를 꼭 확인하세요.</p>
    </div>
  );
}
