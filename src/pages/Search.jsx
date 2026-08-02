import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronUp, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import MovieCard from '../components/MovieCard';
import PlayerOverlay from '../components/PlayerOverlay';
import DiscoveryToolbar from '../components/DiscoveryToolbar';
import MediaShelf from '../components/MediaShelf';
import ConfirmDialog from '../components/ConfirmDialog';
import TitleDetails from '../components/TitleDetails';
import { DISCOVER_GENRES, fetchDiscover, fetchDiscoveryShelves, fetchTrending, searchMulti } from '../api/tmdb';
import {
  clearWatchHistory,
  getContinueWatching,
  mediaKey,
  recordWatch,
  toggleSaved,
} from '../lib/library';
import useLibrary from '../hooks/useLibrary';
import '../App.css';

function sortSearchResults(items, sortBy) {
  if (sortBy === 'trending') return items;

  const sorted = [...items];
  if (sortBy === 'popularity.desc') return sorted.sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0));
  if (sortBy === 'vote_average.desc') return sorted.sort((a, b) => Number(b.vote_average || 0) - Number(a.vote_average || 0));
  if (sortBy === 'primary_release_date.desc') {
    const releaseTime = (item) => Date.parse(item.release_date || item.first_air_date || 0) || 0;
    return sorted.sort((a, b) => releaseTime(b) - releaseTime(a));
  }
  if (sortBy === 'title.asc' || sortBy === 'title.desc') {
    const direction = sortBy === 'title.asc' ? 1 : -1;
    return sorted.sort((a, b) => direction * (a.title || a.name || '').localeCompare(b.title || b.name || ''));
  }
  return sorted;
}

function Search() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [detailsMedia, setDetailsMedia] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [view, setView] = useState('discover');
  const [sortBy, setSortBy] = useState('trending');
  const [genre, setGenre] = useState('all');
  const [year, setYear] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [language, setLanguage] = useState('all');
  const [shelves, setShelves] = useState([]);
  const [retryKey, setRetryKey] = useState(0);
  const { library, mutateLibrary } = useLibrary();
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const abortControllerRef = useRef(null);
  const observer = useRef();

  const savedKeys = useMemo(
    () => new Set(library.watchlist.map((item) => mediaKey(item))),
    [library.watchlist],
  );
  const continueWatching = useMemo(() => getContinueWatching(library), [library]);
  const hasActiveDiscoveryFilters = genre !== 'all' || Boolean(year) || minRating > 0 || language !== 'all' || sortBy !== 'trending';
  const showBrowseShelves = view === 'discover' && !searchQuery && !hasActiveDiscoveryFilters;

  const lastElementRef = useCallback((node) => {
    if (loading || view !== 'discover') return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) setPage((current) => current + 1);
    }, { rootMargin: '400px' });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, view]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 900);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (view !== 'discover') {
      return undefined;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const controller = abortControllerRef.current;

    const fetchCurrentData = async () => {
      setLoading(true);
      setError(null);
      const isAppend = page > 1;

      try {
        let data;
        if (searchQuery) {
          data = await searchMulti(searchQuery, page, { signal: controller.signal });
        } else if (sortBy === 'trending' && genre === 'all' && !year && !minRating && language === 'all') {
          data = await fetchTrending(filter, page, { signal: controller.signal });
        } else {
          data = await fetchDiscover(filter, page, {
            signal: controller.signal,
            genre,
            year,
            minRating,
            language,
            sortBy: sortBy === 'trending' ? 'popularity.desc' : sortBy,
          });
        }

        let nextResults = data.results || [];
        if (searchQuery && filter !== 'all') {
          nextResults = nextResults.filter((item) => item.media_type === filter);
        }
        if (searchQuery && genre !== 'all') {
          nextResults = nextResults.filter((item) => {
            const type = item.media_type || (item.name ? 'tv' : 'movie');
            const genreId = DISCOVER_GENRES[genre]?.[type];
            return genre === 'anime'
              ? item.original_language === 'ja' && item.genre_ids?.includes(16)
              : !genreId || item.genre_ids?.includes(genreId);
          });
        }
        if (searchQuery && year) {
          nextResults = nextResults.filter((item) => (item.release_date || item.first_air_date || '').startsWith(year));
        }
        if (searchQuery && minRating) {
          nextResults = nextResults.filter((item) => Number(item.vote_average || 0) >= minRating);
        }
        if (searchQuery && language !== 'all') {
          nextResults = nextResults.filter((item) => item.original_language === language);
        }
        nextResults = nextResults
          .map((item) => ({
            ...item,
            media_type: item.media_type || (filter === 'all' ? (item.name ? 'tv' : 'movie') : filter),
          }))
          .filter((item) => item.media_type !== 'person' && item.poster_path);
        setResults((current) => {
          const combined = isAppend ? [...current, ...nextResults] : nextResults;
          return searchQuery ? sortSearchResults(combined, sortBy) : combined;
        });
        setHasMore(data.page < Math.min(data.total_pages || 1, 40));
      } catch (err) {
        if (err.name !== 'AbortError') setError('The catalog could not be loaded. Please try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchCurrentData();
    return () => controller.abort();
  }, [filter, genre, language, minRating, page, retryKey, searchQuery, sortBy, view, year]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDiscoveryShelves(filter, { signal: controller.signal })
      .then(setShelves)
      .catch((error) => { if (error.name !== 'AbortError') setShelves([]); });
    return () => controller.abort();
  }, [filter]);

  useEffect(() => {
    document.body.style.overflow = selectedMedia || detailsMedia ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [detailsMedia, selectedMedia]);

  const resetCatalog = useCallback(() => {
    setPage(1);
    setResults([]);
  }, []);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setView('discover');
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((nextFilter) => {
    setFilter(nextFilter);
    setView('discover');
    resetCatalog();
  }, [resetCatalog]);

  const handleViewChange = useCallback((nextView) => {
    setView(nextView);
    setPage(1);
    if (nextView !== 'discover') {
      setLoading(false);
      setError(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCardClick = useCallback((item) => {
    setDetailsMedia(item);
  }, []);

  const handlePlay = useCallback((item) => {
    const previous = library.history.find((entry) => mediaKey(entry) === mediaKey(item));
    setSelectedMedia({ ...item, ...previous });
    setDetailsMedia(null);
    mutateLibrary((current) => recordWatch(current, item));
  }, [library.history, mutateLibrary]);

  const handleToggleWatchlist = useCallback((item) => {
    mutateLibrary((current) => toggleSaved(current, item));
  }, [mutateLibrary]);

  const handlePlaybackProgress = useCallback((update) => {
    if (!selectedMedia) return;
    mutateLibrary((current) => recordWatch(current, selectedMedia, update));
  }, [mutateLibrary, selectedMedia]);

  const libraryResults = useMemo(() => {
    if (view === 'discover') return results;
    const source = view === 'watchlist' ? library.watchlist : library.history;
    const query = searchQuery.trim().toLowerCase();
    return source.filter((item) => {
      const matchesType = filter === 'all' || item.media_type === filter;
      const title = (item.title || item.name || '').toLowerCase();
      return matchesType && (!query || title.includes(query));
    });
  }, [filter, library.history, library.watchlist, results, searchQuery, view]);

  const emptyCopy = view === 'watchlist'
    ? 'Your list is empty. Save a title and it will appear here.'
    : view === 'history'
      ? 'Nothing watched yet. Start a title to build your history.'
      : searchQuery
        ? 'No titles match that search.'
        : 'No titles match these filters.';

  return (
    <div className="search-page">
      <div className="glow-bg" />
      <Navbar currentFilter={filter} setFilter={handleFilterChange} />

      <main className="app-container">
        <Hero onSearch={handleSearch} onSuggestion={handleSearch} isLoading={loading && view === 'discover'} />

        <DiscoveryToolbar
          view={view}
          onViewChange={handleViewChange}
          watchlistCount={library.watchlist.length}
          historyCount={library.history.length}
          sortBy={sortBy}
          onSortChange={(value) => { setSortBy(value); resetCatalog(); }}
          genre={genre}
          onGenreChange={(value) => { setGenre(value); resetCatalog(); }}
          year={year}
          onYearChange={(value) => { setYear(value); resetCatalog(); }}
          minRating={minRating}
          onMinRatingChange={(value) => { setMinRating(value); resetCatalog(); }}
          language={language}
          onLanguageChange={(value) => { setLanguage(value); resetCatalog(); }}
          onResetFilters={() => {
            setGenre('all');
            setYear('');
            setMinRating(0);
            setLanguage('all');
            setSortBy('trending');
            resetCatalog();
          }}
          onClearHistory={() => setConfirmClearHistory(true)}
        />

        {showBrowseShelves ? (
          <MediaShelf
            eyebrow="Pick up where you left off"
            title="Continue watching"
            items={continueWatching}
            onPlay={handleCardClick}
            onToggleWatchlist={handleToggleWatchlist}
            savedKeys={savedKeys}
          />
        ) : null}

        {showBrowseShelves ? shelves.map((shelf) => (
          <MediaShelf
            key={shelf.id}
            eyebrow={shelf.eyebrow}
            title={shelf.title}
            items={shelf.items}
            onPlay={handleCardClick}
            onToggleWatchlist={handleToggleWatchlist}
            savedKeys={savedKeys}
          />
        )) : null}

        {error ? (
          <div className="error-message" role="alert">
            <span>{error}</span>
            <button className="error-retry" onClick={() => setRetryKey((key) => key + 1)}>Try again</button>
          </div>
        ) : null}

        <section className="results-section">
          <div className="section-heading">
            <div>
              <span>{view === 'discover' ? (searchQuery ? 'Search results' : hasActiveDiscoveryFilters ? 'Your filters' : 'Curated for you') : 'Your personal library'}</span>
              <h2>{view === 'watchlist' ? 'My list' : view === 'history' ? 'Watch history' : searchQuery ? `Results for “${searchQuery}”` : hasActiveDiscoveryFilters ? 'Filtered results' : sortBy === 'trending' ? 'Trending now' : 'Explore titles'}</h2>
            </div>
            {libraryResults.length > 0 ? <strong>{libraryResults.length}{view === 'discover' && hasMore ? '+' : ''} titles</strong> : null}
          </div>

          <div className="results-grid">
            {libraryResults.map((item) => (
              <MovieCard
                key={`${item.id}-${item.media_type}`}
                item={item}
                progress={item.progress}
                isSaved={savedKeys.has(mediaKey(item))}
                onToggleWatchlist={() => handleToggleWatchlist(item)}
                onClick={() => handleCardClick(item)}
              />
            ))}
          </div>

          <div ref={lastElementRef} className="scroll-sentinel" />

          {loading && libraryResults.length === 0 ? (
            <div className="results-grid" aria-label="Loading titles">
              {[...Array(12)].map((_, index) => (
                <div key={index} className="movie-card skeleton" style={{ aspectRatio: '2/3', border: 'none' }} />
              ))}
            </div>
          ) : null}

          {loading && libraryResults.length > 0 ? (
            <div className="pagination-loader"><Loader2 className="pagination-spinner" size={20} /></div>
          ) : null}

          {!loading && libraryResults.length === 0 && !error ? (
            <div className="empty-state"><p className="no-results">{emptyCopy}</p></div>
          ) : null}

          {!hasMore && view === 'discover' && libraryResults.length > 0 ? (
            <p className="end-of-results">You’ve reached the end</p>
          ) : null}
        </section>
      </main>

      <AnimatePresence>
        {showBackToTop ? (
          <button className="back-to-top glass" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">
            <ChevronUp size={24} />
          </button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {detailsMedia ? (
          <TitleDetails
            key={`${detailsMedia.media_type || 'movie'}:${detailsMedia.id}`}
            item={detailsMedia}
            isSaved={savedKeys.has(mediaKey(detailsMedia))}
            savedKeys={savedKeys}
            onClose={() => setDetailsMedia(null)}
            onPlay={handlePlay}
            onToggleWatchlist={handleToggleWatchlist}
            onSelectRelated={setDetailsMedia}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedMedia ? (
          <PlayerOverlay
            item={selectedMedia}
            onClose={() => setSelectedMedia(null)}
            onProgress={handlePlaybackProgress}
          />
        ) : null}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmClearHistory}
        title="Clear watch history?"
        description="This removes every watched title and saved playback position from this browser. Your list will stay untouched."
        confirmLabel="Clear history"
        onCancel={() => setConfirmClearHistory(false)}
        onConfirm={() => {
          mutateLibrary(clearWatchHistory);
          setConfirmClearHistory(false);
        }}
      />
    </div>
  );
}

export default Search;
