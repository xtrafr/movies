import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2, Play, List, Server } from 'lucide-react';

const PlayerOverlay = ({ item, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState({ season: 1, episode: 1 });
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [activeServer, setActiveServer] = useState('vidking');

  if (!item) return null;

  const id = item.id;
  const type = item.media_type || 'movie';
  const color = '5e6ad2';

  useEffect(() => {
    if (type === 'tv') {
      const fetchEpisodes = async () => {
        setLoadingEpisodes(true);
        try {
          const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/season/1?api_key=${import.meta.env.VITE_TMDB_API_KEY}`);
          const data = await res.json();
          if (data.episodes) setEpisodes(data.episodes);
        } catch (err) {
          console.error("Failed to fetch episodes", err);
        } finally {
          setLoadingEpisodes(false);
        }
      };
      fetchEpisodes();
    }
  }, [id, type]);

  // Server URLs configuration
  const getEmbedUrl = () => {
    if (activeServer === 'vidking') {
      const baseUrl = type === 'movie'
        ? `https://www.vidking.net/embed/movie/${id}`
        : `https://www.vidking.net/embed/tv/${id}/${currentEpisode.season}/${currentEpisode.episode}`;
      return `${baseUrl}?color=${color}&autoPlay=true&episodeSelector=false&nextEpisode=false&fullScreen=false`;
    } else if (activeServer === 'vidplays') {
      const baseUrl = type === 'movie'
        ? `https://vidplays.fun/embed/movie/${id}`
        : `https://vidplays.fun/embed/tv/${id}/${currentEpisode.season}/${currentEpisode.episode}`;
      return `${baseUrl}?autoplay=true`;
    } else {
      // VidFun.pro
      const baseUrl = type === 'movie'
        ? `https://vidfun.pro/movie/${id}`
        : `https://vidfun.pro/tv/${id}/${currentEpisode.season}/${currentEpisode.episode}`;
      return baseUrl;
    }
  };

  const embedUrl = getEmbedUrl();

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        else onClose();
      }
      if (e.key === 'c') setShowEpisodes(prev => !prev);
      if (e.key === 's') {
        setActiveServer(prev => {
          if (prev === 'vidking') return 'vidplays';
          if (prev === 'vidplays') return 'vidfun';
          return 'vidking';
        });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, isFullscreen]);

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
        className={`player-container-new glass ${showEpisodes ? 'with-episodes' : 'compact'}`}
        layout
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="player-header-bar">
          <div className="player-title-text">
            {item.title || item.name}
            {type === 'tv' && (
              <span className="player-episode-info">
                · S{currentEpisode.season}E{currentEpisode.episode}
              </span>
            )}
          </div>
          
          <div className="player-controls-set">
            <div className="server-selector glass">
              <button 
                className={`server-btn ${activeServer === 'vidking' ? 'active' : ''}`}
                onClick={() => setActiveServer('vidking')}
              >
                S1
              </button>
              <button 
                className={`server-btn ${activeServer === 'vidplays' ? 'active' : ''}`}
                onClick={() => setActiveServer('vidplays')}
              >
                S2
              </button>
              <button 
                className={`server-btn ${activeServer === 'vidfun' ? 'active' : ''}`}
                onClick={() => setActiveServer('vidfun')}
              >
                S3
              </button>
            </div>

            {type === 'tv' && (
              <button
                className={`player-icon-btn ${showEpisodes ? 'active' : ''}`}
                onClick={() => setShowEpisodes(!showEpisodes)}
                title="Toggle Chapters Sidebar"
              >
                <List size={18} />
              </button>
            )}
            <button
              className="player-icon-btn close-btn"
              onClick={onClose}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>


        <div className="player-layout-split">
          <div className="player-content-wrapper">
            <iframe
              src={embedUrl}
              className="player-iframe-new"
              allowFullScreen
              sandbox="allow-forms allow-scripts allow-same-origin allow-presentation"
              title="Video Player"
              key={activeServer + '-' + currentEpisode.season + '-' + currentEpisode.episode}
            />
          </div>

          <AnimatePresence>
            {type === 'tv' && showEpisodes && (
              <motion.div
                className="player-custom-episodes"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="episodes-header">
                  <h3>Chapters</h3>
                  <span className="episodes-count">{episodes.length} items</span>
                </div>
                <div className="episodes-list-scroll">
                  {episodes.map((ep) => (
                    <button
                      key={ep.id}
                      className={`episode-item ${currentEpisode.episode === ep.episode_number ? 'active' : ''}`}
                      onClick={() => setCurrentEpisode({ season: ep.season_number, episode: ep.episode_number })}
                    >
                      <div className="episode-number">{ep.episode_number}</div>
                      <div className="episode-details">
                        <span className="episode-name">{ep.name}</span>
                        <span className="episode-runtime">{ep.runtime ? `${ep.runtime}m` : ''}</span>
                      </div>
                      {currentEpisode.episode === ep.episode_number && <Play size={12} fill="currentColor" />}
                    </button>
                  ))}
                  {loadingEpisodes && <div className="episodes-loading">Loading Chapters...</div>}
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

