async function tmdbFetch(endpoint, { signal } = {}) {
  const proxyUrl = `/api/tmdb?path=${encodeURIComponent(`/3${endpoint}`)}`;
  const res = await fetch(proxyUrl, { signal });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

export function fetchTrending(filter = 'all', page = 1, { signal } = {}) {
  const path = filter === 'movie' ? '/trending/movie/day'
    : filter === 'tv' ? '/trending/tv/day'
    : '/trending/all/day';
  return tmdbFetch(`${path}?page=${page}`, { signal });
}

export const DISCOVER_GENRES = {
  action: { movie: 28, tv: 10759 },
  adventure: { movie: 12, tv: 10759 },
  animation: { movie: 16, tv: 16 },
  anime: { movie: 16, tv: 16 },
  comedy: { movie: 35, tv: 35 },
  crime: { movie: 80, tv: 80 },
  documentary: { movie: 99, tv: 99 },
  drama: { movie: 18, tv: 18 },
  family: { movie: 10751, tv: 10751 },
  fantasy: { movie: 14, tv: 10765 },
  history: { movie: 36, tv: 18 },
  horror: { movie: 27, tv: 9648 },
  music: { movie: 10402, tv: 10767 },
  mystery: { movie: 9648, tv: 9648 },
  romance: { movie: 10749, tv: 18 },
  scifi: { movie: 878, tv: 10765 },
  thriller: { movie: 53, tv: 10759 },
  war: { movie: 10752, tv: 10768 },
  western: { movie: 37, tv: 37 },
};

function discoverType(type, page, { sortBy, genre, year, minRating, language, signal }) {
  const genreId = DISCOVER_GENRES[genre]?.[type];
  const dateField = type === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte';
  const effectiveSort = sortBy === 'title.asc'
    ? (type === 'movie' ? 'original_title.asc' : 'original_name.asc')
    : sortBy === 'title.desc'
      ? (type === 'movie' ? 'original_title.desc' : 'original_name.desc')
      : type === 'tv' && sortBy === 'primary_release_date.desc'
        ? 'first_air_date.desc'
        : sortBy;
  const params = new URLSearchParams({
    page: String(page),
    sort_by: effectiveSort,
    'vote_count.gte': sortBy === 'vote_average.desc' ? '300' : '40',
    'vote_average.gte': String(minRating || 0),
    [dateField]: new Date().toISOString().slice(0, 10),
  });
  if (genreId) params.set('with_genres', String(genreId));
  if (genre === 'anime') params.set('with_original_language', 'ja');
  else if (language && language !== 'all') params.set('with_original_language', language);
  if (year) params.set(type === 'movie' ? 'primary_release_year' : 'first_air_date_year', String(year));
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
    : options.sortBy.includes('date') || options.sortBy.startsWith('title.') ? null : 'popularity';
  const combined = [
    ...(movies.results || []).map((item) => ({ ...item, media_type: 'movie' })),
    ...(shows.results || []).map((item) => ({ ...item, media_type: 'tv' })),
  ];
  if (score) {
    combined.sort((a, b) => (b[score] || 0) - (a[score] || 0));
  } else if (options.sortBy === 'title.asc' || options.sortBy === 'title.desc') {
    const direction = options.sortBy === 'title.asc' ? 1 : -1;
    combined.sort((a, b) => direction * (a.title || a.name || '').localeCompare(b.title || b.name || ''));
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

export function fetchMediaDetails(type, id, { signal } = {}) {
  const safeType = type === 'tv' ? 'tv' : 'movie';
  return tmdbFetch(`/${safeType}/${id}?append_to_response=credits,videos,recommendations,similar`, { signal });
}

export async function fetchDiscoveryShelves(filter = 'all', { signal } = {}) {
  const baseOptions = { signal, year: '', minRating: 0, language: 'all' };
  const [topRated, newest, anime] = await Promise.all([
    fetchDiscover(filter, 1, { ...baseOptions, genre: 'all', sortBy: 'vote_average.desc' }),
    fetchDiscover(filter, 1, { ...baseOptions, genre: 'all', sortBy: 'primary_release_date.desc' }),
    fetchDiscover(filter, 1, { ...baseOptions, genre: 'anime', sortBy: 'popularity.desc' }),
  ]);

  return [
    { id: 'top-rated', eyebrow: 'Loved by audiences', title: 'Top rated', items: topRated.results || [] },
    { id: 'new-releases', eyebrow: 'Fresh this year', title: 'New releases', items: newest.results || [] },
    { id: 'anime', eyebrow: 'Animation from Japan', title: 'Popular anime', items: anime.results || [] },
  ];
}

export function fetchSeasonEpisodes(tvId, seasonNumber, { signal } = {}) {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`, { signal });
}

export const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
