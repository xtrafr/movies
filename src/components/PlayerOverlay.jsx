import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Film } from 'lucide-react';

const EMBED_BASE = 'https://www.vidking.net/embed';

const PlayerOverlay = ({ item, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seasons, setSeasons] = useState([]);
  const [activeSeason, setActiveSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [showEpisodeDropdown, setShowEpisodeDropdown] = useState(false);

  const id = item?.id;
  const type = item?.media_type || 'movie';
  const title = item?.title || item?.name || 'Untitled';

  useEffect(() => {
    if (type !== 'tv' || !id) return;
    let cancelled = false;
    const fetchShow = async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/tv/${id}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`
        );
        const data = await res.json();
        if (!cancelled && data.seasons) {
          const filtered = data.seasons.filter(s => s.season_number > 0);
          setSeasons(filtered);
          const firstSeason = filtered.length > 0 ? filtered[0].season_number : 1;
          setActiveSeason(firstSeason);
          setCurrentEpisode(1);
        }
      } catch (err) {
        console.error('Failed to fetch show details', err);
      }
    };
    fetchShow();
    return () => { cancelled = true; };
  }, [id, type]);

  useEffect(() => {
    if (type !== 'tv' || !id) return;
    let cancelled = false;
    const fetchEpisodes = async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/tv/${id}/season/${activeSeason}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`
        );
        const data = await res.json();
        if (!cancelled && data.episodes) {
          setEpisodes(data.episodes);
          setCurrentEpisode(1);
        }
      } catch (err) {
        console.error('Failed to fetch episodes', err);
      }
    };
    fetchEpisodes();
    return () => { cancelled = true; };
  }, [id, type, activeSeason]);

  const embedUrl = useMemo(() => {
    if (type === 'movie') {
      return `${EMBED_BASE}/movie/${id}?autoplay=true`;
    }
    return `${EMBED_BASE}/tv/${id}/${activeSeason}/${currentEpisode}?autoplay=true`;
  }, [id, type, activeSeason, currentEpisode]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') {
      if (isFullscreen) setIsFullscreen(false);
      else onClose();
    }
  }, [onClose, isFullscreen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!item) return null;

  return (
    <motion.div
      className={`player-overlay ${isFullscreen ? 'is-fullscreen' : 'is-modal'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="player-background" onClick={onClose} />

      <motion.div
        className="player-shell"
        layout
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="player-top-bar">
          <div className="player-title-section">
            <Film size={14} className="player-title-icon" />
            <span className="player-title">{title}</span>
            {type === 'tv' && (
              <span className="player-episode-badge">
                S{activeSeason} E{currentEpisode}
              </span>
            )}
          </div>

          <div className="player-controls-right">
            <button className="player-btn close" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="player-main-area">
          <div className="player-video-area">
            <iframe
              src={embedUrl}
              className="player-iframe"
              allowFullScreen

              title="Video Player"
              key={`${activeSeason}-${currentEpisode}`}
            />

            {type === 'tv' && (
              <div className="player-bottom-nav">
                <div className="nav-season-selector">
                  <button
                    className="season-dropdown-trigger"
                    onClick={() => { setShowSeasonDropdown(!showSeasonDropdown); setShowEpisodeDropdown(false); }}
                  >
                    <span>Season {activeSeason}</span>
                    <ChevronDown size={14} className={showSeasonDropdown ? 'rotated' : ''} />
                  </button>
                  <AnimatePresence>
                    {showSeasonDropdown && (
                      <motion.div
                        className="season-dropdown"
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                      >
                        {seasons.map(s => (
                          <button
                            key={s.season_number}
                            className={`season-option ${activeSeason === s.season_number ? 'active' : ''}`}
                            onClick={() => {
                              setActiveSeason(s.season_number);
                              setShowSeasonDropdown(false);
                            }}
                          >
                            <span className="season-opt-num">{s.season_number}</span>
                            <div className="season-opt-info">
                              <span className="season-opt-name">{s.name}</span>
                              <span className="season-opt-count">{s.episode_count} eps</span>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="nav-season-selector">
                  <button
                    className="season-dropdown-trigger"
                    onClick={() => { setShowEpisodeDropdown(!showEpisodeDropdown); setShowSeasonDropdown(false); }}
                  >
                    <span>Episode {currentEpisode}</span>
                    <ChevronDown size={14} className={showEpisodeDropdown ? 'rotated' : ''} />
                  </button>
                  <AnimatePresence>
                    {showEpisodeDropdown && (
                      <motion.div
                        className="season-dropdown episode-dropdown"
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                      >
                        {episodes.map(ep => (
                          <button
                            key={ep.id}
                            className={`season-option ${currentEpisode === ep.episode_number ? 'active' : ''}`}
                            onClick={() => {
                              setCurrentEpisode(ep.episode_number);
                              setShowEpisodeDropdown(false);
                            }}
                          >
                            <span className="season-opt-num">{ep.episode_number}</span>
                            <div className="season-opt-info">
                              <span className="season-opt-name">{ep.name}</span>
                              {ep.runtime ? <span className="season-opt-count">{ep.runtime}m</span> : null}
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PlayerOverlay;
