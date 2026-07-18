import { useEffect, useState } from "react";
import "./Splash.css";

const MIN_SHOW_MS = 1800;
const FADE_MS = 500;

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
      <div className="splash__stars" aria-hidden="true" />
      <div className="splash__moon" aria-hidden="true" />

      <div className="splash__brand">
        <svg className="splash__logo" viewBox="0 0 64 64" width="72" height="72" aria-hidden="true">
          <g fill="#ffffff">
            <path d="M14 32c8-10 22-10 30 0-8 10-22 10-30 0z" />
            <path d="M44 32l10-8v16z" />
            <circle cx="22" cy="30" r="2.4" fill="#0a2540" />
          </g>
          <path d="M32 4v14" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="32" cy="4" r="2" fill="#ffffff" />
        </svg>
        <h1 className="splash__title">오늘출조</h1>
        <p className="splash__tagline">10초 안에 오늘 출조 판단</p>
      </div>

      <div className="splash__waves" aria-hidden="true">
        <svg className="splash__wave splash__wave--back" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,60 C240,110 480,10 720,60 C960,110 1200,10 1440,60 L1440,120 L0,120 Z" />
        </svg>
        <svg className="splash__wave splash__wave--mid" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,70 C240,20 480,120 720,70 C960,20 1200,120 1440,70 L1440,120 L0,120 Z" />
        </svg>
        <svg className="splash__wave splash__wave--front" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,80 C240,120 480,40 720,80 C960,120 1200,40 1440,80 L1440,120 L0,120 Z" />
        </svg>
      </div>

      <p className="splash__safety">본 정보는 참고용이에요. 출조 전 기상특보를 꼭 확인하세요.</p>
    </div>
  );
}
