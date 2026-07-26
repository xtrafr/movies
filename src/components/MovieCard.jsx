import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Star, Play } from 'lucide-react';

const MovieCard = memo(({ item, onClick }) => {
  const title = item.title || item.name;
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '0.0';
  const year = (item.release_date || item.first_air_date || '').split('-')[0];
  const poster = item.poster_path
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : 'https://via.placeholder.com/500x750?text=No+Image';

  return (
    <motion.div
      className="movie-card glass"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -6, scale: 1.03 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Play ${title}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
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
