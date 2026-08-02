import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Check, ChevronDown, Clock3, Compass, Trash2 } from 'lucide-react';

const GENRES = [
  ['all', 'All'],
  ['action', 'Action'],
  ['animation', 'Animation'],
  ['anime', 'Anime'],
  ['comedy', 'Comedy'],
  ['drama', 'Drama'],
  ['scifi', 'Sci-Fi'],
];

const SORT_OPTIONS = [
  ['trending', 'Trending now', 'What people are watching'],
  ['popularity.desc', 'Most popular', 'The biggest audience favorites'],
  ['vote_average.desc', 'Top rated', 'Highest viewer scores'],
  ['primary_release_date.desc', 'Newest', 'Recently released titles'],
];

const VIEWS = [
  ['discover', 'Discover', <Compass key="discover-icon" size={15} />],
  ['watchlist', 'My list', <Bookmark key="watchlist-icon" size={15} />],
  ['history', 'History', <Clock3 key="history-icon" size={15} />],
];

export default function DiscoveryToolbar({
  view,
  onViewChange,
  watchlistCount,
  historyCount,
  sortBy,
  onSortChange,
  genre,
  onGenreChange,
  onClearHistory,
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sortRef = useRef(null);
  const selectedSort = SORT_OPTIONS.find(([value]) => value === sortBy) || SORT_OPTIONS[0];

  useEffect(() => {
    const handleOutside = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target)) setSortOpen(false);
    };
    const handleKey = (event) => { if (event.key === 'Escape') setSortOpen(false); };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <section className="discovery-toolbar" aria-label="Browse controls">
      <div className="toolbar-topline">
        <div className="library-tabs" role="tablist" aria-label="Library views">
          {VIEWS.map(([id, label, icon]) => {
            const count = id === 'watchlist' ? watchlistCount : id === 'history' ? historyCount : null;
            return (
              <button key={id} role="tab" aria-selected={view === id} className={`library-tab ${view === id ? 'active' : ''}`} onClick={() => onViewChange(id)} data-umami-event="library-view" data-umami-event-view={id}>
                {icon}{label}{count ? <span>{count}</span> : null}
              </button>
            );
          })}
        </div>

        <div className="toolbar-actions">
          {view === 'history' && historyCount > 0 ? (
            <button className="clear-history" onClick={onClearHistory} aria-label="Clear history"><Trash2 size={14} /><span>Clear history</span></button>
          ) : null}
          {view === 'discover' ? (
            <button
              className={`toolbar-filter-toggle ${filtersOpen ? 'active' : ''}`}
              onClick={() => { setFiltersOpen((open) => !open); setSortOpen(false); }}
              aria-expanded={filtersOpen}
              aria-controls="discovery-filter-panel"
              aria-label={filtersOpen ? 'Hide genres and sorting' : 'Show genres and sorting'}
              title={filtersOpen ? 'Hide filters' : 'Show filters'}
            >
              <ChevronDown size={17} />
            </button>
          ) : null}
        </div>
      </div>

      <AnimatePresence initial={false}>
      {view === 'discover' && filtersOpen ? (
        <motion.div
          id="discovery-filter-panel"
          className="filter-panel-shell"
          initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
          animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
          exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
          transition={{ height: { duration: 0.38, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.22 } }}
        >
        <motion.div className="discovery-filters" initial={{ y: -8 }} animate={{ y: 0 }} exit={{ y: -6 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
          <div className="genre-filter-group">
            <div className="filter-heading"><strong>Genres</strong><span>Choose a mood</span></div>
            <div className="genre-chips" aria-label="Filter by genre">
              {GENRES.map(([id, label]) => (
                <button key={id} className={genre === id ? 'active' : ''} onClick={() => onGenreChange(id)} data-umami-event="filter-genre" data-umami-event-genre={id} aria-pressed={genre === id}>
                  <span className="genre-dot" />{label}
                </button>
              ))}
            </div>
          </div>

          <div className="sort-menu" ref={sortRef}>
            <span className="sort-label">Sort by</span>
            <button className="sort-trigger" onClick={() => setSortOpen((open) => !open)} aria-expanded={sortOpen} aria-haspopup="listbox">
              <span>{selectedSort[1]}</span><ChevronDown size={15} className={sortOpen ? 'rotated' : ''} />
            </button>
            <AnimatePresence>
              {sortOpen ? (
                <motion.div className="sort-dropdown" role="listbox" initial={{ opacity: 0, y: -5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.98 }} transition={{ duration: 0.14 }}>
                  {SORT_OPTIONS.map(([value, label, description]) => (
                    <button key={value} role="option" aria-selected={sortBy === value} className={sortBy === value ? 'active' : ''} onClick={() => { onSortChange(value); setSortOpen(false); }}>
                      <span><strong>{label}</strong><small>{description}</small></span>{sortBy === value ? <Check size={15} /> : null}
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </section>
  );
}
