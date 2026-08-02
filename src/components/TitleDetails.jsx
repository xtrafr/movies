import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, CalendarDays, Clock3, Loader2, Play, Star, X } from 'lucide-react';
import { fetchMediaDetails } from '../api/tmdb';
import MediaShelf from './MediaShelf';

const BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

export default function TitleDetails({ item, isSaved, savedKeys, onClose, onPlay, onToggleWatchlist, onSelectRelated }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const type = item?.media_type || (item?.name ? 'tv' : 'movie');

  useEffect(() => {
    if (!item?.id) return undefined;
    const controller = new AbortController();
    fetchMediaDetails(type, item.id, { signal: controller.signal })
      .then((data) => setDetails(data))
      .catch((error) => { if (error.name !== 'AbortError') setDetails(null); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [item?.id, type]);

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const media = useMemo(() => ({ ...item, ...details, media_type: type }), [details, item, type]);
  const title = media.title || media.name;
  const year = (media.release_date || media.first_air_date || '').slice(0, 4);
  const runtime = media.runtime || media.episode_run_time?.[0];
  const cast = (media.credits?.cast || []).slice(0, 5).map((person) => person.name).join(', ');
  const related = (media.recommendations?.results?.length ? media.recommendations.results : media.similar?.results || [])
    .filter((entry) => entry.poster_path)
    .map((entry) => ({ ...entry, media_type: type }));

  return (
    <motion.div className="details-overlay" role="dialog" aria-modal="true" aria-label={`Details for ${title}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" className="details-backdrop-button" onClick={onClose} aria-label="Close title details" />
      <motion.article className="details-modal" initial={{ y: 18, opacity: 0, scale: 0.985 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 12, opacity: 0, scale: 0.99 }} transition={{ duration: 0.24 }}>
        <button type="button" className="details-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <div className="details-hero">
          {media.backdrop_path ? <img src={`${BACKDROP_BASE}${media.backdrop_path}`} alt="" /> : null}
          <div className="details-hero-shade" />
          <div className="details-copy">
            <span className="details-kicker">{type === 'tv' ? 'Series' : 'Movie'}</span>
            <h2>{title}</h2>
            <div className="details-meta">
              {year ? <span><CalendarDays size={14} />{year}</span> : null}
              {runtime ? <span><Clock3 size={14} />{runtime} min</span> : null}
              {media.vote_average ? <span><Star size={14} fill="currentColor" />{media.vote_average.toFixed(1)}</span> : null}
              {media.status ? <span>{media.status}</span> : null}
            </div>
            <div className="details-actions">
              <button type="button" className="details-play" onClick={() => onPlay(media)} data-umami-event="play-from-details"><Play size={17} fill="currentColor" /> Play now</button>
              <button type="button" className={`details-save ${isSaved ? 'active' : ''}`} onClick={() => onToggleWatchlist(media)}><Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />{isSaved ? 'In My list' : 'Add to My list'}</button>
            </div>
          </div>
        </div>

        <div className="details-body">
          {loading ? <div className="details-loading"><Loader2 size={20} /> Loading details</div> : null}
          <div className="details-info-grid">
            <section><span>Story</span><p>{media.overview || 'No overview is available for this title yet.'}</p></section>
            <aside>
              {media.genres?.length ? <div><span>Genres</span><p>{media.genres.map((genre) => genre.name).join(', ')}</p></div> : null}
              {cast ? <div><span>Cast</span><p>{cast}</p></div> : null}
              {media.original_language ? <div><span>Original language</span><p>{media.original_language.toUpperCase()}</p></div> : null}
            </aside>
          </div>

          <AnimatePresence mode="wait">
            {related.length ? (
              <MediaShelf
                key={`${type}-${item.id}`}
                eyebrow="Because you opened this"
                title="More like this"
                items={related}
                onPlay={onSelectRelated}
                onToggleWatchlist={onToggleWatchlist}
                savedKeys={savedKeys}
              />
            ) : null}
          </AnimatePresence>
        </div>
      </motion.article>
    </motion.div>
  );
}
