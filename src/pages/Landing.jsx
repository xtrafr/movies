import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Bookmark, Captions, Code, Play, Search as SearchIcon, ShieldCheck } from 'lucide-react';
import DotGrid from '../components/DotGrid';
import '../App.css';
import { navigate } from '../lib/navigation';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Playback that recovers',
    copy: 'MovieFY moves between five playback sources when a player reports a failure or times out.',
  },
  {
    icon: Captions,
    title: 'Quality and captions',
    copy: 'Captions, adaptive quality, playback progress, and a Firefox smooth mode live in one compact player.',
  },
  {
    icon: Bookmark,
    title: 'A library that stays yours',
    copy: 'Use MovieFY without an account, or sign in to sync My List, history, episodes, and progress.',
  },
];

const POSTERS = [
  'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
  'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
  'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
];

const Landing = () => {
  const { scrollYProgress } = useScroll();
  const rotateX = useTransform(scrollYProgress, [0, 0.4], [8, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.4], [0.92, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.18], [0.72, 1]);

  const openApp = (source) => {
    window.umami?.track?.('launch-app', { source });
    navigate('/search');
  };

  return (
    <div className="landing-page">
      <DotGrid />
      <div className="glow-bg" />

      <nav className="landing-nav glass" aria-label="Main navigation">
        <button className="landing-logo" onClick={() => navigate('/')} aria-label="MovieFY home">MovieFY</button>
        <div className="landing-nav-actions">
          <a href="https://github.com/xtrafr/movies" target="_blank" rel="noopener noreferrer" data-umami-event="open-source-code"><Code size={14} /> Source</a>
          <button onClick={() => openApp('navigation')}>Browse <ArrowRight size={14} /></button>
        </div>
      </nav>

      <main className="landing-content">
        <section className="landing-hero">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>
            <div className="landing-proof"><span>Adaptive HD</span><span>Subtitles</span><span>Optional sync</span></div>
            <h1 className="modern-title">
              Your next favorite story,<br /><span className="hero-accent">ready when you are.</span>
            </h1>
            <p className="modern-subtitle">
              Search movies, series, and anime. Pick up where you stopped, save what looks good, and switch sources without leaving the player.
            </p>
            <div className="modern-actions">
              <button className="modern-btn primary" onClick={() => openApp('hero-primary')}><Play size={16} fill="currentColor" /> Start watching</button>
              <button className="modern-btn secondary" onClick={() => openApp('hero-secondary')}>Browse trending <ArrowRight size={16} /></button>
            </div>
          </motion.div>
        </section>

        <section className="product-preview" aria-label="MovieFY interface preview">
          <div className="preview-container">
            <motion.div style={{ rotateX, scale, opacity }} className="preview-mockup-frame">
              <div className="mockup-header-ui"><div className="dots"><span /><span /><span /></div><div className="url-bar">movies.xtra.wtf/search</div></div>
              <div className="mockup-body-ui">
                <div className="mockup-app-shell">
                  <div className="mockup-search-box glass"><SearchIcon size={14} /><span>Search movies, series, anime...</span></div>
                  <div className="grid-mock">
                    {POSTERS.map((url, index) => <div key={url} className="item-mock"><img src={url} alt={`Featured title ${index + 1}`} className="mock-img" /></div>)}
                  </div>
                </div>
              </div>
              <div className="light-sweep" />
            </motion.div>
          </div>
        </section>

        <section className="landing-stats-container" aria-label="Product highlights">
          <div className="landing-stats-inner">
            {[['Safe sources', '4'], ['Episodes', 'Auto'], ['Captions', 'CC'], ['Library', 'Sync']].map(([label, value], index) => (
              <React.Fragment key={label}>
                {index > 0 ? <div className="stat-line" /> : null}
                <div className="stat-item"><div className="stat-label">{label}</div><div className="stat-number">{value}</div></div>
              </React.Fragment>
            ))}
          </div>
        </section>

        <section className="landing-features-refined app-container">
          <div className="features-creative-header">
            <span className="decorative-label">Designed around the movie</span>
            <h2 className="title-massive">Less hunting.<br />More watching.</h2>
            <p>Useful controls when you need them, a quiet interface when you do not.</p>
          </div>
          <div className="landing-feature-grid">
            {FEATURES.map(({ icon, title, copy }) => (
              <article key={title} className="landing-feature-card">
                <span>{React.createElement(icon, { size: 18 })}</span><h3>{title}</h3><p>{copy}</p>
              </article>
            ))}
          </div>
          <div className="landing-final-cta">
            <p>Start without an account. Sign in only when you want your library on every screen.</p>
            <button className="modern-btn primary" onClick={() => openApp('footer')}><Play size={16} fill="currentColor" /> Open MovieFY</button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;
