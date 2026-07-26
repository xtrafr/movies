import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Film, Server } from 'lucide-react';
import { fetchTVDetails, fetchSeasonEpisodes } from '../api/tmdb';

const SERVERS = [
  { id: 'vidphantom', label: 'VidPhantom', baseUrl: 'https://vidphantom.com' },
  { id: 'vidcore', label: 'VidCore', baseUrl: 'https://vidcore.org/embed' },
  { id: 'vidking', label: 'VidKing', baseUrl: 'https://www.vidking.net/embed' },
  { id: '2embed', label: '2Embed', baseUrl: 'https://www.2embed.stream/embed' },
  { id: 'vidzee', label: 'VidZee', baseUrl: 'https://player.vidzee.wtf/embed' },
];

const PlayerOverlay = ({ item, onClose }) => {
  const [activeServer, setActiveServer] = useState(() => {
    return localStorage.getItem('player-server') || SERVERS[0].id;
  });
  const [seasons, setSeasons] = useState([]);
  const [activeSeason, setActiveSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [showEpisodeDropdown, setShowEpisodeDropdown] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [episodesLoading, setEpisodesLoading] = useState(false);

  const seasonRef = useRef(null);
  const episodeRef = useRef(null);

  const id = item?.id;
  const type = item?.media_type || 'movie';
  const title = item?.title || item?.name || 'Untitled';

  useEffect(() => {
    if (type !== 'tv' || !id) return;
    let cancelled = false;
    const controller = new AbortController();
    const fetchShow = async () => {
      setSeasonsLoading(true);
      try {
        const data = await fetchTVDetails(id, { signal: controller.signal });
        if (!cancelled && data.seasons) {
          const filtered = data.seasons.filter(s => s.season_number > 0);
          setSeasons(filtered);
          const firstSeason = filtered.length > 0 ? filtered[0].season_number : 1;
          setActiveSeason(firstSeason);
          setCurrentEpisode(1);
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Failed to fetch show details', err);
      } finally {
        if (!cancelled) setSeasonsLoading(false);
      }
    };
    fetchShow();
    return () => { cancelled = true; controller.abort(); };
  }, [id, type]);

  useEffect(() => {
    if (type !== 'tv' || !id) return;
    let cancelled = false;
    const controller = new AbortController();
    const fetchEpisodes = async () => {
      setEpisodesLoading(true);
      try {
        const data = await fetchSeasonEpisodes(id, activeSeason, { signal: controller.signal });
        if (!cancelled && data.episodes) {
          setEpisodes(data.episodes);
          setCurrentEpisode(1);
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Failed to fetch episodes', err);
      } finally {
        if (!cancelled) setEpisodesLoading(false);
      }
    };
    fetchEpisodes();
    return () => { cancelled = true; controller.abort(); };
  }, [id, type, activeSeason]);

  const embedUrl = useMemo(() => {
    const server = SERVERS.find(s => s.id === activeServer);
    if (!server) return '';
    if (type === 'movie') {
      return `${server.baseUrl}/movie/${id}?autoPlay=true`;
    }
    return `${server.baseUrl}/tv/${id}/${activeSeason}/${currentEpisode}?autoPlay=true`;
  }, [activeServer, id, type, activeSeason, currentEpisode]);

  useEffect(() => {
    localStorage.setItem('player-server', activeServer);
  }, [activeServer]);

  useEffect(() => {
    setIframeLoaded(false);
    const timeout = setTimeout(() => setIframeLoaded(true), 8000);
    return () => clearTimeout(timeout);
  }, [embedUrl]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    const shell = document.querySelector('.player-shell');
    if (!shell) return;
    const focusable = shell.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length > 0) focusable[0].focus();
  }, []);

  useEffect(() => {
    if (!showSeasonDropdown && !showEpisodeDropdown) return;
    const handleClickOutside = (e) => {
      if (seasonRef.current && !seasonRef.current.contains(e.target)) {
        setShowSeasonDropdown(false);
      }
      if (episodeRef.current && !episodeRef.current.contains(e.target)) {
        setShowEpisodeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSeasonDropdown, showEpisodeDropdown]);

  if (!item) return null;

  return (
    <motion.div
      className="player-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Now playing: ${title}`}
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
            <div className="server-switcher">
              {SERVERS.map((server, i) => (
                <button
                  key={server.id}
                  className={`server-chip ${activeServer === server.id ? 'active' : ''}`}
                  onClick={() => setActiveServer(server.id)}
                  title={server.label}
                >
                  <Server size={12} />
                  <span className="server-chip-num">{i + 1}</span>
                </button>
              ))}
            </div>
            <button className="player-btn close" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="player-main-area">
          <div className="player-video-area">
            {!iframeLoaded && (
              <div className="iframe-loading">
                <div className="iframe-spinner" />
              </div>
            )}
            <iframe
              src={embedUrl}
              className="player-iframe"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer"
              title="Video Player"
              key={`${activeServer}-${activeSeason}-${currentEpisode}`}
              onLoad={() => setIframeLoaded(true)}
            />

            {type === 'tv' && (
              <div className="player-bottom-nav">
                <div className="nav-season-selector" ref={seasonRef}>
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
                        {seasonsLoading ? (
                          <div className="sidebar-loading">
                            {[...Array(4)].map((_, i) => <div key={i} className="sidebar-skeleton" />)}
                          </div>
                        ) : seasons.map(s => (
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

                <div className="nav-season-selector" ref={episodeRef}>
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
                        {episodesLoading ? (
                          <div className="sidebar-loading">
                            {[...Array(4)].map((_, i) => <div key={i} className="sidebar-skeleton" />)}
                          </div>
                        ) : episodes.map(ep => (
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
