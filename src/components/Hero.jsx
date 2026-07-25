import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Hero = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <section className="hero">
      <motion.h1
        className="hero-title"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Cinema <span className="hero-accent">Discovery</span>.
      </motion.h1>

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
            placeholder="Search by movie, series..."
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search movies and TV shows"
          />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
