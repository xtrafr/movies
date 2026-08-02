import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Check, ChevronDown, Clock3, Compass, RotateCcw, Trash2 } from 'lucide-react';

const GENRES = [
  ['all', 'All'], ['action', 'Action'], ['adventure', 'Adventure'], ['animation', 'Animation'],
  ['anime', 'Anime'], ['comedy', 'Comedy'], ['crime', 'Crime'], ['documentary', 'Documentary'],
  ['drama', 'Drama'], ['family', 'Family'], ['fantasy', 'Fantasy'], ['history', 'History'],
  ['horror', 'Horror'], ['music', 'Music'], ['mystery', 'Mystery'], ['romance', 'Romance'],
  ['scifi', 'Sci-Fi'], ['thriller', 'Thriller'], ['war', 'War'], ['western', 'Western'],
];

const SORT_OPTIONS = [
  ['trending', 'Trending now', 'What people are watching'],
  ['popularity.desc', 'Most popular', 'The biggest audience favorites'],
  ['vote_average.desc', 'Top rated', 'Highest viewer scores'],
  ['primary_release_date.desc', 'Newest', 'Recently released titles'],
  ['title.asc', 'Title A to Z', 'Browse alphabetically'],
  ['title.desc', 'Title Z to A', 'Reverse alphabetical order'],
];

const LANGUAGE_OPTIONS = [
  ['all', 'Any language'], ['en', 'English'], ['es', 'Spanish'], ['ja', 'Japanese'],
  ['ko', 'Korean'], ['fr', 'French'], ['de', 'German'], ['it', 'Italian'],
  ['hi', 'Hindi'], ['zh', 'Chinese'],
];
const RATING_OPTIONS = [['0', 'Any rating'], ['6', '6+'], ['7', '7+'], ['8', '8+']];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [['', 'Any year'], ...Array.from({ length: 36 }, (_, index) => {
  const value = String(currentYear - index);
  return [value, value];
})];

const VIEWS = [
  ['discover', 'Discover', <Compass key="discover-icon" size={15} />],
  ['watchlist', 'My list', <Bookmark key="watchlist-icon" size={15} />],
  ['history', 'History', <Clock3 key="history-icon" size={15} />],
];

function FilterMenu({ id, label, value, options, openMenu, setOpenMenu, onChange, descriptive = false }) {
  const selected = options.find(([optionValue]) => String(optionValue) === String(value)) || options[0];
  const isOpen = openMenu === id;

  return (
    <div className={`filter-menu ${descriptive ? 'descriptive' : ''}`}>
      <span className="filter-menu-label">{label}</span>
      <button
        type="button"
        className="filter-menu-trigger"
        onClick={() => setOpenMenu(isOpen ? null : id)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-options`}
      >
        <span>{selected[1]}</span><ChevronDown size={15} className={isOpen ? 'rotated' : ''} />
      </button>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            id={`${id}-options`}
            className="filter-dropdown"
            role="listbox"
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.14 }}
          >
            {options.map(([optionValue, optionLabel, description]) => {
              const selectedOption = String(optionValue) === String(value);
              return (
                <button
                  type="button"
                  key={String(optionValue) || 'any'}
                  role="option"
                  aria-selected={selectedOption}
                  className={selectedOption ? 'active' : ''}
                  onClick={() => { onChange(optionValue); setOpenMenu(null); }}
                >
                  <span><strong>{optionLabel}</strong>{description ? <small>{description}</small> : null}</span>
                  {selectedOption ? <Check size={15} /> : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function DiscoveryToolbar({
  view,
  onViewChange,
  watchlistCount,
  historyCount,
  sortBy,
  onSortChange,
  genre,
  onGenreChange,
  year,
  onYearChange,
  minRating,
  onMinRatingChange,
  language,
  onLanguageChange,
  onResetFilters,
  onClearHistory,
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const controlsRef = useRef(null);
  const hasActiveFilters = genre !== 'all' || year || minRating || language !== 'all' || sortBy !== 'trending';

  useEffect(() => {
    const handleOutside = (event) => {
      if (controlsRef.current && !controlsRef.current.contains(event.target)) setOpenMenu(null);
    };
    const handleKey = (event) => { if (event.key === 'Escape') setOpenMenu(null); };
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
              onClick={() => { setFiltersOpen((open) => !open); setOpenMenu(null); }}
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
                    <button key={id} className={genre === id ? 'active' : ''} onClick={() => { onGenreChange(id); setOpenMenu(null); }} data-umami-event="filter-genre" data-umami-event-genre={id} aria-pressed={genre === id}>
                      <span className="genre-dot" />{label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-controls-grid" ref={controlsRef}>
                <FilterMenu id="sort" label="Sort by" value={sortBy} options={SORT_OPTIONS} openMenu={openMenu} setOpenMenu={setOpenMenu} onChange={onSortChange} descriptive />
                <FilterMenu id="year" label="Year" value={year} options={YEAR_OPTIONS} openMenu={openMenu} setOpenMenu={setOpenMenu} onChange={onYearChange} />
                <FilterMenu id="rating" label="Rating" value={String(minRating)} options={RATING_OPTIONS} openMenu={openMenu} setOpenMenu={setOpenMenu} onChange={(value) => onMinRatingChange(Number(value))} />
                <FilterMenu id="language" label="Language" value={language} options={LANGUAGE_OPTIONS} openMenu={openMenu} setOpenMenu={setOpenMenu} onChange={onLanguageChange} />
              </div>

              {hasActiveFilters ? <button type="button" className="filter-reset" onClick={() => { onResetFilters(); setOpenMenu(null); }}><RotateCcw size={13} /> Reset filters</button> : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
