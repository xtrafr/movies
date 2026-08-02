import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const handleKey = (event) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="confirm-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="confirm-backdrop" onClick={onCancel} aria-label="Cancel" />
          <motion.div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }} transition={{ duration: 0.16 }}>
            <span className="confirm-kicker">Please confirm</span>
            <h2 id="confirm-title">{title}</h2>
            <p id="confirm-description">{description}</p>
            <div className="confirm-actions">
              <button ref={cancelRef} className="confirm-cancel" onClick={onCancel}>Cancel</button>
              <button className="confirm-danger" onClick={onConfirm}>{confirmLabel}</button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
