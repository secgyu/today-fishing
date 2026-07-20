import { adaptive } from "@toss/tds-colors";
import { SearchField } from "@toss/tds-mobile";
import { useMemo, useState } from "react";
import type { PointInfo } from "./api";

interface PointSearchProps {
  points: PointInfo[] | null;
  favorites: string[];
  onSelect: (id: string) => void;
}

/** 전국 포인트 이름 검색 — 선택하면 홈/물때표 기준 지점 변경 */
export function PointSearch({ points, favorites, onSelect }: PointSearchProps) {
  const [q, setQ] = useState("");
  const [fieldKey, setFieldKey] = useState(0);
  const query = q.trim();

  const hits = useMemo(() => {
    if (!points || !query) return [];
    return points.filter((p) => p.name.includes(query)).slice(0, 12);
  }, [points, query]);

  const pick = (id: string) => {
    onSelect(id);
    setQ("");
    setFieldKey((k) => k + 1);
  };

  return (
    <div style={{ position: "relative", margin: "0 16px 4px" }}>
      <SearchField
        key={fieldKey}
        placeholder="포인트 검색 (예: 속초)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onDeleteClick={() => setQ("")}
        aria-label="포인트 검색"
        autoComplete="off"
        enterKeyHint="search"
      />

      {query.length > 0 && (
        <div
          role="listbox"
          aria-label="검색 결과"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            zIndex: 1200,
            maxHeight: 280,
            overflowY: "auto",
            backgroundColor: adaptive.background,
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,.18)",
            marginTop: 4,
          }}
        >
          {hits.length === 0 ? (
            <p style={{ margin: 0, padding: "16px 20px", fontSize: 15, color: adaptive.grey500 }}>
              '{query}' 검색 결과 없어요
            </p>
          ) : (
            hits.map((p) => (
              <button
                key={p.id}
                type="button"
                role="option"
                onClick={() => pick(p.id)}
                style={{
                  display: "block",
                  width: "100%",
                  border: "none",
                  borderBottom: `1px solid ${adaptive.greyOpacity100}`,
                  background: "none",
                  textAlign: "left",
                  padding: "14px 20px",
                  fontSize: 17,
                  fontWeight: 600,
                  color: adaptive.grey800,
                  cursor: "pointer",
                }}
              >
                {favorites.includes(p.id) ? `★ ${p.name}` : p.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
