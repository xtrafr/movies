import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Server, Key, Code } from 'lucide-react';

const SERVERS_LIST = [
  { name: 'VidPhantom', url: 'vidphantom.com' },
  { name: 'VidCore', url: 'vidcore.org' },
  { name: 'VidKing', url: 'vidking.net' },
  { name: '2Embed', url: '2embed.stream' },
  { name: 'VidZee', url: 'player.vidzee.wtf' },
];

const DocsModal = ({ isOpen, onClose }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    const firstFocusable = modalRef.current?.querySelector('button, [href], [tabindex]:not([tabindex="-1"])');
    firstFocusable?.focus();
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="docs-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="docs-backdrop" onClick={onClose} />
          <motion.div
            ref={modalRef}
            className="docs-modal glass"
            role="dialog"
            aria-modal="true"
            aria-label="Documentation"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="docs-header">
              <h2>MovieFY Docs</h2>
              <button className="docs-close" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="docs-body">
              <section className="docs-section">
                <div className="docs-section-icon">
                  <Key size={16} />
                </div>
                <div>
                  <h3>TMDB API Key</h3>
                  <p>
                    MovieFY uses <a href="https://www.themoviedb.org/documentation/api" target="_blank" rel="noopener noreferrer">The Movie Database API</a> for search, trending, and metadata. You need a free API key to run this project.
                  </p>
                  <div className="docs-code">
                    <code>VITE_TMDB_API_KEY=your_key_here</code>
                  </div>
                  <p className="docs-note">
                    Get your key at <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">themoviedb.org/settings/api</a>
                  </p>
                </div>
              </section>

              <section className="docs-section">
                <div className="docs-section-icon">
                  <Code size={16} />
                </div>
                <div>
                  <h3>Source Code</h3>
                  <p>
                    Open source under the MIT license. Contributions welcome.
                  </p>
                  <a
                    href="https://github.com/xtrafr/movies"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="docs-link"
                  >
                    View on GitHub <ExternalLink size={12} />
                  </a>
                </div>
              </section>

              <section className="docs-section">
                <div className="docs-section-icon">
                  <Server size={16} />
                </div>
                <div>
                  <h3>Embed Servers</h3>
                  <p>
                    Video streams are served through third-party embed providers. You can switch servers from the player UI. All servers use TMDB IDs.
                  </p>
                  <div className="docs-servers-grid">
                    {SERVERS_LIST.map((s) => (
                      <div key={s.name} className="docs-server-chip">
                        <span className="docs-server-name">{s.name}</span>
                        <span className="docs-server-url">{s.url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="docs-section">
                <h3>Quick Start</h3>
                <div className="docs-code-block">
                  <code>
                    <span className="docs-code-comment"># Clone and install</span>{'\n'}
                    git clone https://github.com/xtrafr/movies.git{'\n'}
                    cd moviefy && npm install{'\n\n'}
                    <span className="docs-code-comment"># Add your TMDB API key</span>{'\n'}
                    echo "VITE_TMDB_API_KEY=your_key" &gt; .env{'\n\n'}
                    <span className="docs-code-comment"># Run</span>{'\n'}
                    npm run dev
                  </code>
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DocsModal;
