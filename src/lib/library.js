const STORAGE_KEY = 'moviefy-library-v2';
const MAX_HISTORY = 80;

const EMPTY_LIBRARY = { watchlist: [], history: [] };

export const mediaKey = (item) => `${item.media_type || 'movie'}:${item.id}`;

export function compactMedia(item) {
  return {
    id: item.id,
    media_type: item.media_type || (item.name ? 'tv' : 'movie'),
    title: item.title,
    name: item.name,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    release_date: item.release_date,
    first_air_date: item.first_air_date,
    vote_average: item.vote_average,
    genre_ids: item.genre_ids || [],
    overview: item.overview || '',
  };
}

export function loadLibrary() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      watchlist: Array.isArray(parsed?.watchlist) ? parsed.watchlist : [],
      history: Array.isArray(parsed?.history) ? parsed.history : [],
    };
  } catch {
    return EMPTY_LIBRARY;
  }
}

export function persistLibrary(library) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch {
    // Keep the in-memory library usable when storage is blocked or full.
  }
  return library;
}

export function toggleSaved(library, item) {
  const key = mediaKey(item);
  const exists = library.watchlist.some((entry) => mediaKey(entry) === key);
  return {
    ...library,
    watchlist: exists
      ? library.watchlist.filter((entry) => mediaKey(entry) !== key)
      : [{ ...compactMedia(item), savedAt: Date.now() }, ...library.watchlist],
  };
}

export function recordWatch(library, item, update = {}) {
  const key = mediaKey(item);
  const previous = library.history.find((entry) => mediaKey(entry) === key);
  const entry = {
    ...compactMedia(item),
    ...previous,
    ...update,
    lastWatchedAt: Date.now(),
  };

  return {
    ...library,
    history: [entry, ...library.history.filter((candidate) => mediaKey(candidate) !== key)].slice(0, MAX_HISTORY),
  };
}

export function getContinueWatching(library) {
  return library.history.filter((entry) => entry.progress > 0.5 && entry.progress < 95);
}

export function clearWatchHistory(library) {
  return { ...library, history: [] };
}
