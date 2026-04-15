import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ currentFilter, setFilter }) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      className="navbar-wrapper"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <nav
        className="navbar rounded"
        style={{
          background: scrolled ? 'rgba(5, 5, 10, 0.6)' : 'rgba(10, 12, 30, 0)',
          backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          border: scrolled ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(59, 130, 246, 0.25)',
          boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.4), 0 4px 20px rgba(59, 130, 246, 0.05)' : '0 4px 20px rgba(59, 130, 246, 0.05)',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div
          className="logo"
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
        >
          <span className="logo-text">MovieFY</span>
        </div>
        <div className="nav-links">
          <button
            onClick={() => setFilter('movie')}
            className={`nav-link ${currentFilter === 'movie' ? 'active' : ''}`}
          >
            Movies
          </button>
          <button
            onClick={() => setFilter('tv')}
            className={`nav-link ${currentFilter === 'tv' ? 'active' : ''}`}
          >
            TV Shows
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`nav-link ${currentFilter === 'all' ? 'active' : ''}`}
          >
            Explore
          </button>
        </div>
      </nav>
    </motion.header>
  );
};

export default Navbar;
