import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUp, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import MovieCard from '../components/MovieCard';
import PlayerOverlay from '../components/PlayerOverlay';
import { fetchTrending, searchMulti } from '../api/tmdb';
import '../App.css';

function Search() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const abortControllerRef = useRef(null);
  const observer = useRef();

  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    }, { rootMargin: '400px' });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 1000);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  useEffect(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    const fetchCurrentData = async () => {
      setLoading(true);
      setError(null);

      const isAppend = page > 1;

      try {
        let data;
        if (searchQuery) {
          data = await searchMulti(searchQuery, page, { signal: abortControllerRef.current.signal });
        } else {
          data = await fetchTrending(filter, page, { signal: abortControllerRef.current.signal });
        }

        let filteredResults = data.results || [];
        if (searchQuery && filter !== 'all') {
          filteredResults = filteredResults.filter(item => item.media_type === filter);
        }

        const enrichedResults = filteredResults.map(item => ({
          ...item,
          media_type: item.media_type || (filter === 'all' ? 'movie' : filter)
        })).filter(item => item.media_type !== 'person');

        setResults(prev => isAppend ? [...prev, ...enrichedResults] : enrichedResults);
        setHasMore(data.page < data.total_pages);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError("Could not load content at this moment.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentData();

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [filter, searchQuery, page]);

  useEffect(() => {
    document.body.style.overflow = selectedMedia ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedMedia]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((f) => {
    setFilter(f);
    setPage(1);
    setResults([]);
  }, []);

  const handleCardClick = useCallback((item) => {
    setSelectedMedia(item);
  }, []);

  return (
    <div className="search-page">
      <div className="glow-bg" />
      <Navbar currentFilter={filter} setFilter={handleFilterChange} />

      <main className="app-container">
        <Hero onSearch={handleSearch} isLoading={loading} />

        {error && (
          <div className="error-message">
            <span>{error}</span>
            <button className="error-retry" onClick={() => setPage(p => p)}>Try again</button>
          </div>
        )}

        <section className="results-section">
          <div className="results-grid">
            {results.map((item, index) => (
              <MovieCard
                key={`${item.id}-${item.media_type}-${index}`}
                item={item}
                onClick={() => handleCardClick(item)}
              />
            ))}
          </div>

          <div ref={lastElementRef} className="scroll-sentinel" />

          {loading && results.length === 0 && (
            <div className="results-grid">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="movie-card skeleton" style={{ aspectRatio: '2/3', border: 'none' }} />
              ))}
            </div>
          )}

          {loading && results.length > 0 && (
            <div className="pagination-loader">
              <Loader2 className="pagination-spinner" size={20} />
            </div>
          )}

          {!loading && results.length === 0 && searchQuery && (
            <div className="empty-state">
              <p className="no-results">No results found matching your search.</p>
            </div>
          )}

          {!hasMore && results.length > 0 && (
            <p className="end-of-results">You've reached the end</p>
          )}
        </section>
      </main>

      <AnimatePresence>
        {showBackToTop && (
          <button className="back-to-top glass" onClick={scrollToTop} aria-label="Back to Top">
            <ChevronUp size={24} />
          </button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedMedia && (
          <PlayerOverlay
            item={selectedMedia}
            onClose={() => setSelectedMedia(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Search;
