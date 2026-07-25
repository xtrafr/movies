import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, List, Server, ChevronDown, ChevronRight, Monitor, Tv, Film } from 'lucide-react';

const SERVERS = [
  { id: 'vidking', label: 'Server 1', icon: Monitor, baseUrl: 'https://www.vidking.net/embed' },
  { id: 'vidplays', label: 'Server 2', icon: Server, baseUrl: 'https://vidplays.fun/embed' },
  { id: 'vidfun', label: 'Server 3', icon: Tv, baseUrl: 'https://vidfun.pro' },
];

const PlayerOverlay = ({ item, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeServer, setActiveServer] = useState('vidking');
  const [showSidebar, setShowSidebar] = useState(false);
  const [seasons, setSeasons] = useState([]);
  const [activeSeason, setActiveSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);

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
      setLoadingEpisodes(true);
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
      } finally {
        if (!cancelled) setLoadingEpisodes(false);
      }
    };
    fetchEpisodes();
    return () => { cancelled = true; };
  }, [id, type, activeSeason]);

  const embedUrl = useMemo(() => {
    const server = SERVERS.find(s => s.id === activeServer);
    if (!server) return '';
    if (type === 'movie') {
      return `${server.baseUrl}/movie/${id}`;
    }
    return `${server.baseUrl}/tv/${id}/${activeSeason}/${currentEpisode}`;
  }, [activeServer, id, type, activeSeason, currentEpisode]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') {
      if (isFullscreen) setIsFullscreen(false);
      else onClose();
    }
    if (e.key === 'c') setShowSidebar(prev => !prev);
    if (e.key === 's') {
      setActiveServer(prev => {
        const idx = SERVERS.findIndex(s => s.id === prev);
        return SERVERS[(idx + 1) % SERVERS.length].id;
      });
    }
  }, [onClose, isFullscreen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const goToNextEpisode = () => {
    const currentIdx = episodes.findIndex(ep => ep.episode_number === currentEpisode);
    if (currentIdx < episodes.length - 1) {
      setCurrentEpisode(episodes[currentIdx + 1].episode_number);
    }
  };

  const goToPrevEpisode = () => {
    const currentIdx = episodes.findIndex(ep => ep.episode_number === currentEpisode);
    if (currentIdx > 0) {
      setCurrentEpisode(episodes[currentIdx - 1].episode_number);
    }
  };

  const goToNextSeason = () => {
    const idx = seasons.findIndex(s => s.season_number === activeSeason);
    if (idx < seasons.length - 1) {
      setActiveSeason(seasons[idx + 1].season_number);
    }
  };

  const goToPrevSeason = () => {
    const idx = seasons.findIndex(s => s.season_number === activeSeason);
    if (idx > 0) {
      setActiveSeason(seasons[idx - 1].season_number);
    }
  };

  const currentEpIdx = episodes.findIndex(ep => ep.episode_number === currentEpisode);
  const hasNextEpisode = currentEpIdx < episodes.length - 1;
  const hasPrevEpisode = currentEpIdx > 0;

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
        className={`player-shell ${showSidebar && type === 'tv' ? 'with-sidebar' : ''}`}
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
            <div className="server-switcher">
              {SERVERS.map((server, i) => {
                const Icon = server.icon;
                return (
                  <button
                    key={server.id}
                    className={`server-chip ${activeServer === server.id ? 'active' : ''}`}
                    onClick={() => setActiveServer(server.id)}
                    title={server.label}
                  >
                    <Icon size={13} />
                    <span className="server-chip-num">{i + 1}</span>
                  </button>
                );
              })}
            </div>

            {type === 'tv' && (
              <>
                <button
                  className={`player-btn ${showSidebar ? 'active' : ''}`}
                  onClick={() => setShowSidebar(!showSidebar)}
                  title="Episodes"
                >
                  <List size={16} />
                </button>
              </>
            )}
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
              key={`${activeServer}-${activeSeason}-${currentEpisode}`}
            />

            {type === 'tv' && (
              <div className="player-bottom-nav">
                <button
                  className="nav-ep-btn"
                  disabled={!hasPrevEpisode}
                  onClick={goToPrevEpisode}
                >
                  <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                  <span>Prev</span>
                </button>

                <div className="nav-season-selector">
                  <button
                    className="season-dropdown-trigger"
                    onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
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

                <button
                  className="nav-ep-btn"
                  disabled={!hasNextEpisode}
                  onClick={goToNextEpisode}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {type === 'tv' && showSidebar && (
              <motion.div
                className="player-sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="sidebar-header">
                  <div className="sidebar-header-top">
                    <h3>Episodes</h3>
                    <span className="sidebar-count">{episodes.length} episodes</span>
                  </div>
                  <div className="sidebar-season-nav">
                    <button
                      className="sidebar-season-btn"
                      disabled={seasons.findIndex(s => s.season_number === activeSeason) === 0}
                      onClick={goToPrevSeason}
                    >
                      <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <span className="sidebar-season-label">Season {activeSeason}</span>
                    <button
                      className="sidebar-season-btn"
                      disabled={seasons.findIndex(s => s.season_number === activeSeason) === seasons.length - 1}
                      onClick={goToNextSeason}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
                <div className="sidebar-episode-list">
                  {loadingEpisodes ? (
                    <div className="sidebar-loading">
                      <div className="sidebar-skeleton" />
                      <div className="sidebar-skeleton" />
                      <div className="sidebar-skeleton" />
                      <div className="sidebar-skeleton" />
                    </div>
                  ) : (
                    episodes.map((ep) => (
                      <button
                        key={ep.id}
                        className={`sidebar-ep-item ${currentEpisode === ep.episode_number ? 'active' : ''}`}
                        onClick={() => setCurrentEpisode(ep.episode_number)}
                      >
                        <div className="sidebar-ep-num">
                          {currentEpisode === ep.episode_number ? (
                            <Play size={10} fill="currentColor" />
                          ) : (
                            <span>{ep.episode_number}</span>
                          )}
                        </div>
                        <div className="sidebar-ep-info">
                          <span className="sidebar-ep-name">{ep.name}</span>
                          <div className="sidebar-ep-meta">
                            {ep.air_date && <span>{ep.air_date.split('-')[0]}</span>}
                            {ep.runtime ? <span>{ep.runtime}m</span> : null}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PlayerOverlay;
