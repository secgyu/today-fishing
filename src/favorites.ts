const KEY = "favorites";
export const MAX_FAVORITES = 5;

export function getFavorites(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** 토글 결과. blocked=true면 최대 개수 초과로 추가 실패 */
export function toggleFavorite(id: string): { favorites: string[]; blocked: boolean } {
  const cur = getFavorites();
  if (cur.includes(id)) {
    const favorites = cur.filter((x) => x !== id);
    localStorage.setItem(KEY, JSON.stringify(favorites));
    return { favorites, blocked: false };
  }
  if (cur.length >= MAX_FAVORITES) {
    return { favorites: cur, blocked: true };
  }
  const favorites = [...cur, id];
  localStorage.setItem(KEY, JSON.stringify(favorites));
  return { favorites, blocked: false };
}
