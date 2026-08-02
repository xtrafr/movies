import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';

export default function MediaShelf({ title, eyebrow, items, onPlay, onToggleWatchlist, savedKeys }) {
  const trackRef = useRef(null);
  const [scrollState, setScrollState] = useState({ left: false, right: true });

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    setScrollState({
      left: track.scrollLeft > 8,
      right: track.scrollLeft < maxScroll - 8,
    });
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [items, updateScrollState]);

  const scrollShelf = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(280, track.clientWidth * 0.78), behavior: 'smooth' });
  };

  if (!items.length) return null;

  return (
    <section className="media-shelf">
      <div className="shelf-heading">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <div className="shelf-controls" aria-label={`${title} navigation`}>
          <button type="button" onClick={() => scrollShelf(-1)} disabled={!scrollState.left} aria-label={`Show previous ${title} titles`}><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => scrollShelf(1)} disabled={!scrollState.right} aria-label={`Show more ${title} titles`}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="shelf-track" ref={trackRef} onScroll={updateScrollState}>
        {items.map((item) => (
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
