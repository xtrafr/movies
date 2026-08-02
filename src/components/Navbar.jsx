import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Cloud, LogOut, UserRound } from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';
import DocsModal from './DocsModal';
import AuthModal from './AuthModal';
import { useAuth } from '../context/AuthContext';
import { navigate } from '../lib/navigation';

const Navbar = ({ currentFilter, setFilter }) => {
  const [scrolled, setScrolled] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const { user, recoveryMode, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
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
            data-umami-event="filter-media"
            data-umami-event-type="movie"
            className={`nav-link ${currentFilter === 'movie' ? 'active' : ''}`}
          >
            Movies
          </button>
          <button
            onClick={() => setFilter('tv')}
            data-umami-event="filter-media"
            data-umami-event-type="tv"
            className={`nav-link ${currentFilter === 'tv' ? 'active' : ''}`}
          >
            TV Shows
          </button>
          <button
            onClick={() => setFilter('all')}
            data-umami-event="filter-media"
            data-umami-event-type="all"
            className={`nav-link ${currentFilter === 'all' ? 'active' : ''}`}
          >
            Explore
          </button>
          <button
            onClick={() => setShowDocs(true)}
            data-umami-event="open-project-guide"
            className="nav-link docs-btn"
            title="Documentation"
            aria-label="Open project guide"
          >
            <BookOpen size={13} />
            <span className="docs-label">Docs</span>
          </button>
          <a
            href="https://discord.gg/Mhx9fVtth5"
            target="_blank"
            rel="noreferrer"
            className="nav-link discord-link"
            title="Join the Discord"
            aria-label="Join the MovieFY Discord"
            data-umami-event="open-discord"
          >
            <FaDiscord size={15} aria-hidden="true" />
          </a>
          <div className="account-nav">
            <button
              type="button"
              className={`nav-link account-trigger ${user ? 'signed-in' : ''}`}
              onClick={() => user ? setShowAccount((open) => !open) : setShowAuth(true)}
              aria-expanded={user ? showAccount : undefined}
              aria-label={user ? 'Open account menu' : 'Sign in'}
              title={user ? user.email : 'Sign in to sync'}
            >
              {user ? <Cloud size={14} /> : <UserRound size={14} />}
              <span>{user ? 'Synced' : 'Sign in'}</span>
            </button>
            {user && showAccount ? (
              <div className="account-menu">
                <span>Signed in as</span>
                <strong>{user.email}</strong>
                <p><Cloud size={13} /> Your library syncs securely.</p>
                <button type="button" onClick={async () => { setShowAccount(false); await signOut(); }}><LogOut size={14} /> Sign out</button>
              </div>
            ) : null}
          </div>
        </div>
      </nav>
    </motion.header>
    <DocsModal isOpen={showDocs} onClose={() => setShowDocs(false)} />
    <AuthModal open={showAuth || recoveryMode} onClose={() => setShowAuth(false)} />
    </>
  );
};

export default Navbar;
