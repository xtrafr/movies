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

const DISCOVER_GENRES = {
  action: { movie: 28, tv: 10759 },
  animation: { movie: 16, tv: 16 },
  anime: { movie: 16, tv: 16 },
  comedy: { movie: 35, tv: 35 },
  drama: { movie: 18, tv: 18 },
  scifi: { movie: 878, tv: 10765 },
};

function discoverType(type, page, { sortBy, genre, signal }) {
  const genreId = DISCOVER_GENRES[genre]?.[type];
  const dateField = type === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte';
  const effectiveSort = type === 'tv' && sortBy === 'primary_release_date.desc'
    ? 'first_air_date.desc'
    : sortBy;
  const params = new URLSearchParams({
    page: String(page),
    sort_by: effectiveSort,
    'vote_count.gte': sortBy === 'vote_average.desc' ? '300' : '40',
    [dateField]: new Date().toISOString().slice(0, 10),
  });
  if (genreId) params.set('with_genres', String(genreId));
  if (genre === 'anime') params.set('with_original_language', 'ja');
  return tmdbFetch(`/discover/${type}?${params}`, { signal });
}

export async function fetchDiscover(filter = 'all', page = 1, options = {}) {
  if (filter !== 'all') {
    const data = await discoverType(filter, page, options);
    return {
      ...data,
      results: (data.results || []).map((item) => ({ ...item, media_type: filter })),
    };
  }

  const [movies, shows] = await Promise.all([
    discoverType('movie', page, options),
    discoverType('tv', page, options),
  ]);
  const score = options.sortBy.startsWith('vote_average') ? 'vote_average'
    : options.sortBy.includes('date') ? null : 'popularity';
  const combined = [
    ...(movies.results || []).map((item) => ({ ...item, media_type: 'movie' })),
    ...(shows.results || []).map((item) => ({ ...item, media_type: 'tv' })),
  ];
  if (score) {
    combined.sort((a, b) => (b[score] || 0) - (a[score] || 0));
  } else {
    const releaseTime = (item) => Date.parse(item.release_date || item.first_air_date || 0) || 0;
    combined.sort((a, b) => releaseTime(b) - releaseTime(a));
  }
  return {
    page,
    total_pages: Math.min(movies.total_pages || 1, shows.total_pages || 1),
    results: combined,
  };
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
