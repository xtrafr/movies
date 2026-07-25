import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search as SearchIcon, Server } from 'lucide-react';
import VariableProximityText from '../components/VariableProximityText';
import DotGrid from '../components/DotGrid';
import '../App.css';

const Landing = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();

  // Rotating mockup transform
  const rotateX = useTransform(scrollYProgress, [0, 0.4], [12, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.4], [0.85, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [0.5, 1]);

  // The Big Three - Ultra-reliable links
  const samplePosters = [
    'https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_QL75_UX380_CR0,0,380,562_.jpg', // Interstellar
    'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_QL75_UX380_CR0,0,380,562_.jpg', // Inception
    'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_QL75_UX380_CR0,0,380,562_.jpg'  // The Dark Knight
  ];

  return (
    <div className="landing-page">
      <DotGrid />
      <div className="glow-bg" />

      <nav className="landing-nav glass">
        <div className="logo" onClick={() => navigate('/')}>MovieFY</div>
      </nav>

      <main className="landing-content">
        <section className="landing-hero" style={{ paddingTop: '8rem' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <h1 className="modern-title" style={{ marginBottom: '1.5rem' }}>
              <span className="title-italic">Cinema discovery.</span><br />
              <span className="title-regular hero-accent">Simplified.</span>
            </h1>
            <p className="modern-subtitle" style={{ marginBottom: '2.5rem' }}>
              A cinematic player for the people. Stream millions of titles with<br />
              adaptive quality, subtitles, and a zero-distraction UI.
            </p>
            <div className="modern-actions">
              <button className="modern-btn primary" onClick={() => navigate('/search')}>Launch App</button>
              <button className="modern-btn secondary" onClick={() => navigate('/search')}>Explore Library</button>
            </div>
          </motion.div>
        </section>

        <section className="product-preview" style={{ marginTop: '4rem' }}>
          <div className="preview-container">
            <motion.div
              style={{ rotateX, scale, opacity }}
              className="preview-mockup-frame"
            >
              <div className="mockup-header-ui">
                <div className="dots"><span /><span /><span /></div>
                <div className="url-bar">movies.xtra.wtf/browse</div>
              </div>
              <div className="mockup-body-ui">
                <div className="mockup-app-shell">
                  <div className="mockup-search-box glass">
                    <SearchIcon size={14} className="text-secondary" />
                    <span>Search by movie, series...</span>
                  </div>
                  <div className="grid-mock">
                    {samplePosters.map((url, i) => (
                      <div key={i} className="item-mock">
                        <img src={url} alt="Film Poster" className="mock-img" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="light-sweep" />
            </motion.div>
          </div>
        </section>

        <section className="landing-stats-container">
          <div className="landing-stats-inner">
            <div className="stat-item">
              <div className="stat-label">MOVIES</div>
              <div className="stat-number">914,248</div>
            </div>
            <div className="stat-line" />
            <div className="stat-item">
              <div className="stat-label">TV SERIES</div>
              <div className="stat-number">162,105</div>
            </div>
            <div className="stat-line" />
            <div className="stat-item">
              <div className="stat-label">DATABASE</div>
              <div className="stat-number">1.0M+</div>
            </div>
            <div className="stat-line" />
            <div className="stat-item">
              <div className="stat-label">API SOURCES</div>
              <div className="stat-number">3</div>
            </div>
          </div>
        </section>

        <section className="landing-features-refined app-container">
          <div className="features-creative-header">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            >
              <span className="decorative-label">OUR MANIFESTO</span>
              <VariableProximityText
                text={"Built for scale.\nDesigned for speed."}
                className="title-massive"
                fromWeight={300}
                toWeight={900}
                radius={300}
              />
              <div className="header-glow-line" />
            </motion.div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Landing;

