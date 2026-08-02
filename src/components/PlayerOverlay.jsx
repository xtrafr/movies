import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Film, Server, X } from 'lucide-react';
import { fetchSeasonEpisodes, fetchTVDetails } from '../api/tmdb';
import { buildPlayerUrl, PLAYER_SOURCES } from '../lib/playerSources';

const TRUSTED_ORIGINS = new Set([
  'https://vidphantom.com',
  'https://vidcore.org',
  'https://www.vidcore.org',
  'https://www.vidking.net',
  'https://vidking.net',
  'https://www.2embed.stream',
  'https://2embed.stream',
  'https://player.vidzee.wtf',
]);

function containsPlayerError(data) {
  try {
    const value = typeof data === 'string' ? data : JSON.stringify(data);
    return /error|failed|unavailable|not_found/i.test(value);
  } catch {
    return false;
  }
}

const PlayerOverlay = ({ item, onClose }) => {
  const id = item?.id;
  const type = item?.media_type || 'movie';
  const title = item?.title || item?.name || 'Untitled';
  const [activeServer, setActiveServer] = useState(PLAYER_SOURCES[0].id);
  const [seasons, setSeasons] = useState([]);
  const [activeSeason, setActiveSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [showEpisodeDropdown, setShowEpisodeDropdown] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [seasonsLoading, setSeasonsLoading] = useState(type === 'tv');
  const [episodesLoading, setEpisodesLoading] = useState(type === 'tv');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  const seasonRef = useRef(null);
  const episodeRef = useRef(null);
  const failedServersRef = useRef(new Set());
  const failoverTimerRef = useRef(null);
  const selectionModeRef = useRef('automatic');
  const playerShellRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const activeServerInfo = PLAYER_SOURCES.find((source) => source.id === activeServer) || PLAYER_SOURCES[0];

  const showControls = useCallback(() => {
    clearTimeout(controlsTimerRef.current);
    setControlsVisible(true);
    if (!showSeasonDropdown && !showEpisodeDropdown) {
      controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 2800);
    }
  }, [showEpisodeDropdown, showSeasonDropdown]);

  const embedUrl = useMemo(() => buildPlayerUrl({
    serverId: activeServer,
    type,
    id,
    season: activeSeason,
    episode: currentEpisode,
  }), [activeSeason, activeServer, currentEpisode, id, type]);

  const switchToNextServer = useCallback(() => {
    selectionModeRef.current = 'automatic';
    failedServersRef.current.add(activeServer);
    const currentIndex = PLAYER_SOURCES.findIndex((source) => source.id === activeServer);
    for (let offset = 1; offset <= PLAYER_SOURCES.length; offset += 1) {
      const candidate = PLAYER_SOURCES[(currentIndex + offset) % PLAYER_SOURCES.length];
      if (!failedServersRef.current.has(candidate.id)) {
        setIframeLoaded(false);
        setActiveServer(candidate.id);
        return;
      }
    }
    failedServersRef.current.clear();
    setIframeLoaded(false);
    setActiveServer(PLAYER_SOURCES[(currentIndex + 1) % PLAYER_SOURCES.length].id);
  }, [activeServer]);

  useEffect(() => {
    if (type !== 'tv' || !id) return undefined;
    const controller = new AbortController();
    fetchTVDetails(id, { signal: controller.signal })
      .then((data) => {
        const available = (data.seasons || []).filter((season) => season.season_number > 0);
        setSeasons(available);
        setActiveSeason(available[0]?.season_number || 1);
        setCurrentEpisode(1);
      })
      .catch((error) => { if (error.name !== 'AbortError') console.error('Failed to load seasons', error); })
      .finally(() => setSeasonsLoading(false));
    return () => controller.abort();
  }, [id, type]);

  useEffect(() => {
    if (type !== 'tv' || !id) return undefined;
    const controller = new AbortController();
    fetchSeasonEpisodes(id, activeSeason, { signal: controller.signal })
      .then((data) => {
        setEpisodes(data.episodes || []);
        setCurrentEpisode(1);
      })
      .catch((error) => { if (error.name !== 'AbortError') console.error('Failed to load episodes', error); })
      .finally(() => setEpisodesLoading(false));
    return () => controller.abort();
  }, [activeSeason, id, type]);

  useEffect(() => {
    if (selectionModeRef.current === 'manual') return undefined;
    const controller = new AbortController();
    const query = new URLSearchParams({
      server: activeServer,
      type,
      id: String(id),
      season: String(activeSeason),
      episode: String(currentEpisode),
    });
    fetch(`/api/player-health?${query}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((result) => {
        if (selectionModeRef.current === 'automatic' && !result.ok) switchToNextServer();
      })
      .catch(() => {});
    return () => controller.abort();
  }, [activeSeason, activeServer, currentEpisode, id, switchToNextServer, type]);

  useEffect(() => {
    failedServersRef.current.clear();
  }, [activeSeason, currentEpisode, id]);

  useEffect(() => {
    clearTimeout(failoverTimerRef.current);
    failoverTimerRef.current = setTimeout(switchToNextServer, 14000);
    return () => clearTimeout(failoverTimerRef.current);
  }, [activeServer, embedUrl, switchToNextServer]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (TRUSTED_ORIGINS.has(event.origin) && containsPlayerError(event.data)) switchToNextServer();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [switchToNextServer]);

  useEffect(() => {
    const handleKey = (event) => { if (event.key === 'Escape') onClose(); };
    const handleOutsideClick = (event) => {
      if (seasonRef.current && !seasonRef.current.contains(event.target)) setShowSeasonDropdown(false);
      if (episodeRef.current && !episodeRef.current.contains(event.target)) setShowEpisodeDropdown(false);
    };
    window.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [onClose]);

  useEffect(() => {
    clearTimeout(controlsTimerRef.current);
    if (!showSeasonDropdown && !showEpisodeDropdown) {
      controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 2800);
    }
    return () => clearTimeout(controlsTimerRef.current);
  }, [showEpisodeDropdown, showSeasonDropdown]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
      const playerFullscreen = Boolean(
        fullscreenElement
        && (fullscreenElement === playerShellRef.current || fullscreenElement.classList?.contains('player-iframe'))
      );
      setIsPlayerFullscreen(playerFullscreen);
      if (playerFullscreen) {
        clearTimeout(controlsTimerRef.current);
        setControlsVisible(false);
      } else {
        showControls();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [showControls]);

  if (!item) return null;

  return (
    <motion.div className="player-overlay" role="dialog" aria-modal="true" aria-label={`Now playing: ${title}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="player-background" onClick={onClose} />
      <motion.div
        ref={playerShellRef}
        className={`player-shell ${controlsVisible && !isPlayerFullscreen ? 'controls-visible' : 'controls-hidden'} ${isPlayerFullscreen ? 'embedded-fullscreen' : ''}`}
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.985 }}
        onPointerMove={showControls}
        onTouchStart={showControls}
        onFocusCapture={showControls}
      >
        <div className="player-controls-reveal player-controls-reveal-top" onPointerEnter={showControls} aria-hidden="true" />
        {type === 'tv' ? <div className="player-controls-reveal player-controls-reveal-bottom" onPointerEnter={showControls} aria-hidden="true" /> : null}

        <div className="player-top-bar">
          <div className="player-title-section">
            <Film size={14} className="player-title-icon" />
            <span className="player-title">{title}</span>
            {type === 'tv' ? <span className="player-episode-badge">S{activeSeason} E{currentEpisode}</span> : null}
          </div>
          <div className="player-controls-right">
            <div className="server-switcher" aria-label="Playback source">
              {PLAYER_SOURCES.map((source, index) => (
                <button
                  key={source.id}
                  className={`server-chip ${activeServer === source.id ? 'active' : ''}`}
                  onClick={() => {
                    selectionModeRef.current = 'manual';
                    failedServersRef.current.clear();
                    setIframeLoaded(false);
                    setActiveServer(source.id);
                  }}
                  title={`${source.label}: ${source.sandboxCompatible ? 'popup-restricted' : 'compatibility mode'}`}
                  aria-label={`Use ${source.label}`}
                >
                  <Server size={12} /><span>{index + 1}</span>
                </button>
              ))}
            </div>
            <button className="player-btn close" onClick={onClose} title="Close" aria-label="Close player"><X size={18} /></button>
          </div>
        </div>

        <div className="player-main-area">
          <div className="player-video-area">
            {!iframeLoaded ? <div className="iframe-loading"><div className="iframe-spinner" /></div> : null}
            <iframe
              src={embedUrl}
              className="player-iframe"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock"
              allowFullScreen
              sandbox={activeServerInfo.sandboxCompatible ? 'allow-scripts allow-same-origin allow-forms allow-presentation allow-modals allow-pointer-lock' : undefined}
              referrerPolicy="no-referrer"
              title={`${title} video player`}
              key={`${activeServer}-${activeSeason}-${currentEpisode}`}
              onLoad={() => { clearTimeout(failoverTimerRef.current); setIframeLoaded(true); }}
              onError={switchToNextServer}
            />

            {type === 'tv' ? (
              <div className="player-bottom-nav">
                <div className="nav-season-selector" ref={seasonRef}>
                  <button className="season-dropdown-trigger" onClick={() => { setShowSeasonDropdown((open) => !open); setShowEpisodeDropdown(false); }}>
                    Season {activeSeason}<ChevronDown size={14} />
                  </button>
                  <AnimatePresence>
                    {showSeasonDropdown ? (
                      <motion.div className="season-dropdown" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                        {seasonsLoading ? <div className="sidebar-loading"><div className="sidebar-skeleton" /><div className="sidebar-skeleton" /></div> : seasons.map((season) => (
                          <button key={season.season_number} className={`season-option ${activeSeason === season.season_number ? 'active' : ''}`} onClick={() => { setEpisodesLoading(true); setIframeLoaded(false); setActiveSeason(season.season_number); setShowSeasonDropdown(false); }}>
                            <span className="season-opt-num">{season.season_number}</span>
                            <span className="season-opt-info"><span className="season-opt-name">{season.name}</span><span className="season-opt-count">{season.episode_count} episodes</span></span>
                          </button>
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <div className="nav-season-selector" ref={episodeRef}>
                  <button className="season-dropdown-trigger" onClick={() => { setShowEpisodeDropdown((open) => !open); setShowSeasonDropdown(false); }}>
                    Episode {currentEpisode}<ChevronDown size={14} />
                  </button>
                  <AnimatePresence>
                    {showEpisodeDropdown ? (
                      <motion.div className="season-dropdown episode-dropdown" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                        {episodesLoading ? <div className="sidebar-loading"><div className="sidebar-skeleton" /><div className="sidebar-skeleton" /></div> : episodes.map((episode) => (
                          <button key={episode.id} className={`season-option ${currentEpisode === episode.episode_number ? 'active' : ''}`} onClick={() => { setIframeLoaded(false); setCurrentEpisode(episode.episode_number); setShowEpisodeDropdown(false); }}>
                            <span className="season-opt-num">{episode.episode_number}</span>
                            <span className="season-opt-info"><span className="season-opt-name">{episode.name}</span><span className="season-opt-count">{episode.runtime ? `${episode.runtime} min` : 'Episode'}</span></span>
                          </button>
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PlayerOverlay;
