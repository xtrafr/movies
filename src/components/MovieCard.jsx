import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, Play, Star } from 'lucide-react';

const MovieCard = memo(({ item, onClick, onToggleWatchlist, isSaved = false, progress = 0, compact = false }) => {
  const title = item.title || item.name;
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '0.0';
  const year = (item.release_date || item.first_air_date || '').split('-')[0];
  const poster = item.poster_path
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : 'https://via.placeholder.com/500x750?text=No+Image';

  return (
    <motion.div
      className={`movie-card glass ${compact ? 'compact' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${title}`}
      data-umami-event="open-title"
      data-umami-event-media-type={item.media_type || 'movie'}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
    >
      <div className="card-poster-wrapper">
        <img src={poster} alt={title} className="card-poster" loading="lazy" />
        <div className="card-play-overlay">
          <div className="card-play-icon">
            <Play size={24} fill="currentColor" />
          </div>
        </div>
        <div className="card-badge">
          {item.media_type === 'tv' ? 'TV' : 'Movie'}
        </div>
        {onToggleWatchlist ? (
          <button
            type="button"
            className={`card-save ${isSaved ? 'active' : ''}`}
            aria-label={isSaved ? `Remove ${title} from My list` : `Add ${title} to My list`}
            title={isSaved ? 'Remove from My list' : 'Add to My list'}
            data-umami-event={isSaved ? 'remove-from-list' : 'add-to-list'}
            onClick={(event) => {
              event.stopPropagation();
              onToggleWatchlist();
            }}
          >
            <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        ) : null}
        {progress > 0 ? (
          <div className="card-progress" aria-label={`${Math.round(progress)}% watched`}>
            <span style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        ) : null}
      </div>
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <div className="card-meta">
          <span className="card-year">{year || 'N/A'}</span>
          <div className="card-rating">
            <Star size={12} fill="currentColor" stroke="none" />
            <span>{rating}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

MovieCard.displayName = 'MovieCard';

export default MovieCard;
