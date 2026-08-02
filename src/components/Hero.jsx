import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Hero = ({ onSearch, isLoading, onSuggestion }) => {
  const [query, setQuery] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <section className="hero">
      <motion.h1
        className="hero-title"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Find your next <span className="hero-accent">obsession.</span>
      </motion.h1>
      <motion.p
        className="hero-subtitle"
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.28 }}
      >
        Movies, series and anime in one fast, personal cinema.
      </motion.p>

      <motion.div
        className="search-box-container"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="search-box glass">
          {isLoading ? (
            <Loader2 className="search-spinner" size={20} />
          ) : (
            <Search className="search-icon" size={20} />
          )}
          <input
            type="search"
            placeholder="Search movies, series, anime..."
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search movies and TV shows"
          />
        </div>
      </motion.div>
      <motion.div className="hero-suggestions" aria-label="Popular searches" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        {['Dune', 'Shōgun', 'One Piece'].map((label) => (
          <button key={label} onClick={() => { setQuery(label); onSuggestion?.(label); }}>{label}</button>
        ))}
      </motion.div>
    </section>
  );
};

export default Hero;
