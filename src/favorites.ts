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

/** 토글 후 새 목록 반환. 최대 개수 초과 추가는 무시. */
export function toggleFavorite(id: string): string[] {
  const cur = getFavorites();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < MAX_FAVORITES ? [...cur, id] : cur;
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
