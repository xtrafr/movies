import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Captions, ChevronDown, Film, Server, SkipForward, X } from 'lucide-react';
import { fetchSeasonEpisodes, fetchTVDetails } from '../api/tmdb';
import { getNextEpisodeSelection, normalizePlayerEvent, shouldAdvanceEpisode } from '../lib/playerEvents';
import { buildPlayerUrl, PLAYER_SOURCES } from '../lib/playerSources';

const TRUSTED_ORIGINS = new Set([
  'https://flix.screenscape.me',
  'https://moviesapi.to',
  'https://player.embed-api.stream',
  'https://apiplayer.ru',
]);

function containsPlayerError(data) {
  try {
    const value = typeof data === 'string' ? data : JSON.stringify(data);
    return /error|failed|unavailable|not_found/i.test(value);
  } catch {
    return false;
  }
}

export default function PlayerOverlay({ item, onClose, onProgress }) {
  const id = item?.id;
  const type = item?.media_type || 'movie';
  const title = item?.title || item?.name || 'Untitled';
  const initialSeason = Math.max(1, Number(item?.season || 1));
  const initialEpisode = Math.max(1, Number(item?.episode || 1));
  const [activeServer, setActiveServer] = useState(PLAYER_SOURCES[0].id);
  const [seasons, setSeasons] = useState([]);
  const [activeSeason, setActiveSeason] = useState(initialSeason);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [showEpisodeDropdown, setShowEpisodeDropdown] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [seasonsLoading, setSeasonsLoading] = useState(type === 'tv');
  const [episodesLoading, setEpisodesLoading] = useState(type === 'tv');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  const [startAt, setStartAt] = useState(Math.max(0, Number(item?.watchedSeconds || 0)));
  const seasonRef = useRef(null);
  const episodeRef = useRef(null);
  const iframeRef = useRef(null);
  const failedServersRef = useRef(new Set());
  const failoverTimerRef = useRef(null);
  const selectionModeRef = useRef('automatic');
  const playerShellRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const currentTimeRef = useRef(Math.max(0, Number(item?.watchedSeconds || 0)));
  const durationRef = useRef(Math.max(0, Number(item?.durationSeconds || 0)));
  const lastProgressReportRef = useRef(0);
  const requestedEpisodeRef = useRef(initialEpisode);
  const episodeAdvanceStartedRef = useRef(false);
  const watchStartedAtRef = useRef(null);
  const watchEventSentRef = useRef(false);
  const activeServerRef = useRef(activeServer);
  const activeServerInfo = PLAYER_SOURCES.find((source) => source.id === activeServer) || PLAYER_SOURCES[0];

  useEffect(() => {
    watchStartedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    activeServerRef.current = activeServer;
  }, [activeServer]);

  const trackWatchSession = useCallback(() => {
    if (watchEventSentRef.current) return;
    watchEventSentRef.current = true;
    const startedAt = watchStartedAtRef.current || Date.now();
    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    window.umami?.track?.('watch-session', {
      seconds,
      media_type: type,
      source: activeServerRef.current,
    });
  }, [type]);

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
    startAt,
    subtitleLanguage: 'en',
  }), [activeSeason, activeServer, currentEpisode, id, startAt, type]);

  const nextEpisodeSelection = useMemo(() => {
    if (type !== 'tv') return null;
    return getNextEpisodeSelection({ seasons, episodes, activeSeason, currentEpisode });
  }, [activeSeason, currentEpisode, episodes, seasons, type]);
  const hasNextEpisode = Boolean(nextEpisodeSelection);

  const reportProgress = useCallback((force = false) => {
    if (!onProgress || durationRef.current <= 0) return;
    const now = Date.now();
    if (!force && now - lastProgressReportRef.current < 12000) return;
    lastProgressReportRef.current = now;
    onProgress({
      progress: Math.min(100, (currentTimeRef.current / durationRef.current) * 100),
      watchedSeconds: currentTimeRef.current,
      durationSeconds: durationRef.current,
      season: type === 'tv' ? activeSeason : undefined,
      episode: type === 'tv' ? currentEpisode : undefined,
    });
  }, [activeSeason, currentEpisode, onProgress, type]);

  const advanceEpisode = useCallback(() => {
    if (type !== 'tv') return;
    currentTimeRef.current = 0;
    durationRef.current = 0;
    setStartAt(0);
    setIframeLoaded(false);

    if (!nextEpisodeSelection) return;
    if (nextEpisodeSelection.season === activeSeason) {
      setCurrentEpisode(nextEpisodeSelection.episode);
      return;
    }

    requestedEpisodeRef.current = nextEpisodeSelection.episode;
    setEpisodesLoading(true);
    setActiveSeason(nextEpisodeSelection.season);
  }, [activeSeason, nextEpisodeSelection, type]);

  const autoAdvanceEpisode = useCallback(() => {
    if (!hasNextEpisode || episodeAdvanceStartedRef.current) return;
    episodeAdvanceStartedRef.current = true;
    reportProgress(true);
    advanceEpisode();
  }, [advanceEpisode, hasNextEpisode, reportProgress]);

  const switchToNextServer = useCallback(() => {
    selectionModeRef.current = 'automatic';
    failedServersRef.current.add(activeServer);
    setStartAt(Math.floor(currentTimeRef.current));
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
        const resumeSeasonExists = available.some((season) => season.season_number === initialSeason);
        setActiveSeason(resumeSeasonExists ? initialSeason : (available[0]?.season_number || 1));
      })
      .catch((error) => { if (error.name !== 'AbortError') console.error('Failed to load seasons', error); })
      .finally(() => setSeasonsLoading(false));
    return () => controller.abort();
  }, [id, initialSeason, type]);

  useEffect(() => {
    if (type !== 'tv' || !id) return undefined;
    const controller = new AbortController();
    fetchSeasonEpisodes(id, activeSeason, { signal: controller.signal })
      .then((data) => {
        const availableEpisodes = data.episodes || [];
        setEpisodes(availableEpisodes);
        const requested = requestedEpisodeRef.current;
        setCurrentEpisode(availableEpisodes.some((episode) => episode.episode_number === requested) ? requested : 1);
        requestedEpisodeRef.current = 1;
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
    episodeAdvanceStartedRef.current = false;
  }, [activeSeason, currentEpisode, id]);

  useEffect(() => {
    clearTimeout(failoverTimerRef.current);
    failoverTimerRef.current = setTimeout(switchToNextServer, 14000);
    return () => clearTimeout(failoverTimerRef.current);
  }, [activeServer, embedUrl, switchToNextServer]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (!TRUSTED_ORIGINS.has(event.origin) || event.source !== iframeRef.current?.contentWindow) return;
      const playerEvent = normalizePlayerEvent(event.data);
      if (playerEvent) {
        if (playerEvent.event === 'ready' && activeServer === 'apiplayer' && startAt > 0) {
          iframeRef.current?.contentWindow?.postMessage({ type: 'mplayer', action: 'seek', value: Math.floor(startAt) }, 'https://apiplayer.ru');
        }
        if (Number.isFinite(Number(playerEvent.currentTime))) currentTimeRef.current = Number(playerEvent.currentTime);
        if (Number.isFinite(Number(playerEvent.duration))) durationRef.current = Number(playerEvent.duration);
        if (playerEvent.event === 'timeupdate' || playerEvent.event === 'pause' || playerEvent.event === 'seeked') reportProgress(playerEvent.event !== 'timeupdate');
        if (shouldAdvanceEpisode({
          ...playerEvent,
          currentTime: playerEvent.currentTime ?? currentTimeRef.current,
          duration: playerEvent.duration ?? durationRef.current,
        })) autoAdvanceEpisode();
      }
      if (containsPlayerError(event.data)) switchToNextServer();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeServer, autoAdvanceEpisode, reportProgress, startAt, switchToNextServer]);

  useEffect(() => {
    if (type !== 'tv' || activeServer !== 'screenscape' || !iframeLoaded) return undefined;
    const requestProgress = () => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'SCREENSCAPE_GET_PROGRESS',
        requestId: `moviefy-${id}-${activeSeason}-${currentEpisode}`,
        tmdb: id,
        tmdbId: id,
        mediaType: type,
        season: activeSeason,
        episode: currentEpisode,
      }, 'https://flix.screenscape.me');
    };
    requestProgress();
    const timer = setInterval(requestProgress, 4000);
    return () => clearInterval(timer);
  }, [activeSeason, activeServer, currentEpisode, id, iframeLoaded, type]);

  const handleClose = useCallback(() => {
    reportProgress(true);
    trackWatchSession();
    onClose();
  }, [onClose, reportProgress, trackWatchSession]);

  useEffect(() => {
    window.addEventListener('pagehide', trackWatchSession);
    return () => window.removeEventListener('pagehide', trackWatchSession);
  }, [trackWatchSession]);

  useEffect(() => {
    const handleKey = (event) => { if (event.key === 'Escape') handleClose(); };
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
  }, [handleClose]);

  useEffect(() => {
    clearTimeout(controlsTimerRef.current);
    if (!showSeasonDropdown && !showEpisodeDropdown) controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 2800);
    return () => clearTimeout(controlsTimerRef.current);
  }, [showEpisodeDropdown, showSeasonDropdown]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
      const playerFullscreen = Boolean(fullscreenElement && (fullscreenElement === playerShellRef.current || fullscreenElement.classList?.contains('player-iframe')));
      setIsPlayerFullscreen(playerFullscreen);
      if (playerFullscreen) {
        clearTimeout(controlsTimerRef.current);
        setControlsVisible(false);
      } else showControls();
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
      <div className="player-background" onClick={handleClose} />
      <motion.div ref={playerShellRef} className={`player-shell ${controlsVisible && !isPlayerFullscreen ? 'controls-visible' : 'controls-hidden'} ${isPlayerFullscreen ? 'embedded-fullscreen' : ''}`} initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.985 }} onPointerMove={showControls} onTouchStart={showControls} onFocusCapture={showControls}>
        <div className="player-controls-reveal player-controls-reveal-top" onPointerEnter={showControls} aria-hidden="true" />
        {type === 'tv' ? <div className="player-controls-reveal player-controls-reveal-bottom" onPointerEnter={showControls} aria-hidden="true" /> : null}

        <div className="player-top-bar">
          <div className="player-title-section">
            <Film size={14} className="player-title-icon" />
            <span className="player-title">{title}</span>
            {type === 'tv' ? <span className="player-episode-badge">S{activeSeason} E{currentEpisode}</span> : null}
          </div>
          <div className="player-controls-right">
            <span className="player-caption-status" title="Subtitles and quality are available in the player controls"><Captions size={14} /> CC</span>
            <div className="server-switcher" aria-label="Playback source">
              {PLAYER_SOURCES.map((source, index) => (
                <button key={source.id} className={`server-chip ${activeServer === source.id ? 'active' : ''}`} onClick={() => { selectionModeRef.current = 'manual'; failedServersRef.current.clear(); setStartAt(Math.floor(currentTimeRef.current)); setIframeLoaded(false); setActiveServer(source.id); }} title={`${source.label}: popup-restricted`} aria-label={`Use ${source.label}`}>
                  <Server size={12} /><span>{index + 1}</span>
                </button>
              ))}
            </div>
            <button className="player-btn close" onClick={handleClose} title="Close" aria-label="Close player"><X size={18} /></button>
          </div>
        </div>

        <div className="player-main-area">
          <div className="player-video-area">
            {!iframeLoaded ? <div className="iframe-loading"><div className="iframe-spinner" /></div> : null}
            <iframe ref={iframeRef} src={embedUrl} className="player-iframe" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock" allowFullScreen sandbox={activeServerInfo.sandboxCompatible ? 'allow-scripts allow-same-origin allow-forms allow-presentation allow-modals allow-pointer-lock' : undefined} referrerPolicy="no-referrer" title={`${title} video player`} key={`${activeServer}-${activeSeason}-${currentEpisode}`} onLoad={() => { clearTimeout(failoverTimerRef.current); setIframeLoaded(true); }} onError={switchToNextServer} />

            {type === 'tv' ? (
              <div className="player-bottom-nav">
                <div className="nav-season-selector" ref={seasonRef}>
                  <button className="season-dropdown-trigger" onClick={() => { setShowSeasonDropdown((open) => !open); setShowEpisodeDropdown(false); }}>Season {activeSeason}<ChevronDown size={14} /></button>
                  <AnimatePresence>{showSeasonDropdown ? <motion.div className="season-dropdown" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>{seasonsLoading ? <div className="sidebar-loading"><div className="sidebar-skeleton" /><div className="sidebar-skeleton" /></div> : seasons.map((season) => <button key={season.season_number} className={`season-option ${activeSeason === season.season_number ? 'active' : ''}`} onClick={() => { requestedEpisodeRef.current = 1; currentTimeRef.current = 0; setStartAt(0); setEpisodesLoading(true); setIframeLoaded(false); setActiveSeason(season.season_number); setShowSeasonDropdown(false); }}><span className="season-opt-num">{season.season_number}</span><span className="season-opt-info"><span className="season-opt-name">{season.name}</span><span className="season-opt-count">{season.episode_count} episodes</span></span></button>)}</motion.div> : null}</AnimatePresence>
                </div>

                <div className="nav-season-selector" ref={episodeRef}>
                  <button className="season-dropdown-trigger" onClick={() => { setShowEpisodeDropdown((open) => !open); setShowSeasonDropdown(false); }}>Episode {currentEpisode}<ChevronDown size={14} /></button>
                  <AnimatePresence>{showEpisodeDropdown ? <motion.div className="season-dropdown episode-dropdown" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>{episodesLoading ? <div className="sidebar-loading"><div className="sidebar-skeleton" /><div className="sidebar-skeleton" /></div> : episodes.map((episode) => <button key={episode.id} className={`season-option ${currentEpisode === episode.episode_number ? 'active' : ''}`} onClick={() => { currentTimeRef.current = 0; durationRef.current = 0; setStartAt(0); setIframeLoaded(false); setCurrentEpisode(episode.episode_number); setShowEpisodeDropdown(false); }}><span className="season-opt-num">{episode.episode_number}</span><span className="season-opt-info"><span className="season-opt-name">{episode.name}</span><span className="season-opt-count">{episode.runtime ? `${episode.runtime} min` : 'Episode'}</span></span></button>)}</motion.div> : null}</AnimatePresence>
                </div>
                {hasNextEpisode ? <button className="player-next-button" onClick={advanceEpisode} title="Play next episode"><SkipForward size={15} /><span>Next</span></button> : null}
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
