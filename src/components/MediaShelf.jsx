import { ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';

export default function MediaShelf({ title, eyebrow, items, onPlay, onToggleWatchlist, savedKeys }) {
  if (!items.length) return null;

  return (
    <section className="media-shelf">
      <div className="shelf-heading">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <ChevronRight size={19} aria-hidden="true" />
      </div>
      <div className="shelf-track">
        {items.slice(0, 12).map((item) => (
          <MovieCard
            key={`shelf-${item.media_type}-${item.id}`}
            item={item}
            compact
            progress={item.progress}
            isSaved={savedKeys.has(`${item.media_type}:${item.id}`)}
            onToggleWatchlist={() => onToggleWatchlist(item)}
            onClick={() => onPlay(item)}
          />
        ))}
      </div>
    </section>
  );
}
