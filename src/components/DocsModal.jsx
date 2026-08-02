import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Server, Terminal, X } from 'lucide-react';

const SERVERS = [
  ['01', 'VidPhantom', 'Primary source'],
  ['02', 'VidKing', 'Episode support'],
  ['03', '2Embed', 'Backup source'],
  ['04', 'VidZee', 'High-quality backup'],
  ['05', 'VidCore', 'Fallback source'],
];

const DocsModal = ({ isOpen, onClose }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    modalRef.current?.querySelector('button, [href]')?.focus();
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div className="docs-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <button className="docs-backdrop" onClick={onClose} aria-label="Close documentation" />
          <motion.div ref={modalRef} className="docs-modal" role="dialog" aria-modal="true" aria-labelledby="docs-title" initial={{ opacity: 0, scale: 0.985, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.985, y: 10 }} transition={{ duration: 0.19, ease: [0.16, 1, 0.3, 1] }}>
            <div className="docs-modal-bar">
              <span>Project documentation</span>
              <button className="docs-close" onClick={onClose} aria-label="Close documentation"><X size={18} /></button>
            </div>

            <aside className="docs-intro">
              <span className="docs-eyebrow">MovieFY guide</span>
              <h2 id="docs-title">Run it locally.</h2>
              <p>Connect your TMDB key, start Vite, and browse the same catalog on your own machine.</p>

              <div className="docs-links">
                <a href="https://github.com/xtrafr/movies" target="_blank" rel="noopener noreferrer" data-umami-event="open-source-code">Source on GitHub <ExternalLink size={13} /></a>
                <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">Get a TMDB key <ExternalLink size={13} /></a>
              </div>

              <div className="docs-note">
                <strong>How playback works</strong>
                <p>MovieFY opens independent providers and quietly skips a source when its health check or player reports a failure.</p>
              </div>
            </aside>

            <div className="docs-content">
              <section className="docs-quick-start">
                <div className="docs-section-heading">
                  <Terminal size={16} />
                  <div><h3>Quick start</h3><p>Three commands and one environment value.</p></div>
                </div>
                <pre><code><span>git clone https://github.com/xtrafr/movies.git</span>{'\n'}<span>cd movies && npm install</span>{'\n'}<span>copy .env.example .env</span>{'\n'}<span>npm run dev</span></code></pre>
                <div className="docs-env"><span>.env</span><code>VITE_TMDB_API_KEY=your_key</code></div>
              </section>

              <section className="docs-servers">
                <div className="docs-section-heading">
                  <Server size={16} />
                  <div><h3>Playback sources</h3><p>Select one manually or let MovieFY switch automatically.</p></div>
                </div>
                <div className="docs-server-list">
                  {SERVERS.map(([number, name, note]) => (
                    <div key={name}><span>{number}</span><strong>{name}</strong><small>{note}</small></div>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default DocsModal;
