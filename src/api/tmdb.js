const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

async function tmdbFetch(endpoint, { signal } = {}) {
  const sep = endpoint.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE_URL}${endpoint}${sep}api_key=${API_KEY}&language=en-US`, { signal });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

export function fetchTrending(filter = 'all', page = 1, { signal } = {}) {
  const path = filter === 'movie' ? '/trending/movie/day'
    : filter === 'tv' ? '/trending/tv/day'
    : '/trending/all/day';
  return tmdbFetch(`${path}?page=${page}`, { signal });
}

export function searchMulti(query, page = 1, { signal } = {}) {
  return tmdbFetch(`/search/multi?query=${encodeURIComponent(query)}&page=${page}`, { signal });
}

export function fetchTVDetails(id, { signal } = {}) {
  return tmdbFetch(`/tv/${id}`, { signal });
}

export function fetchSeasonEpisodes(tvId, seasonNumber, { signal } = {}) {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`, { signal });
}

export const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
