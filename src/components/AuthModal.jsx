import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AtSign, CheckCircle2, KeyRound, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const copy = {
  signin: { title: 'Welcome back', description: 'Sync My list and watch history.', action: 'Sign in' },
  signup: { title: 'Create account', description: 'Keep your library on every device.', action: 'Create account' },
  reset: { title: 'Reset password', description: 'We will email you a secure reset link.', action: 'Send reset link' },
  update: { title: 'New password', description: 'Use at least 10 characters.', action: 'Update password' },
};

export default function AuthModal({ open, onClose }) {
  const { configured, recoveryMode, signIn, signUp, sendPasswordReset, updatePassword, finishRecovery } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!configured) {
      setError('Account sync is not configured in this environment.');
      return;
    }
    const activeMode = recoveryMode ? 'update' : mode;
    if (activeMode !== 'reset' && password.length < 10) {
      setError('Use at least 10 characters for your password.');
      return;
    }

    setBusy(true);
    const result = activeMode === 'signin'
      ? await signIn(email, password)
      : activeMode === 'signup'
        ? await signUp(email, password)
        : activeMode === 'update'
          ? await updatePassword(password)
          : await sendPasswordReset(email);
    setBusy(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (activeMode === 'signin' || activeMode === 'update') {
      if (activeMode === 'update') finishRecovery();
      onClose();
      return;
    }
    setMessage(mode === 'signup'
      ? 'Check your inbox to confirm your account.'
      : 'A secure reset link is on its way.');
  };

  const activeMode = recoveryMode ? 'update' : mode;
  const currentCopy = copy[activeMode];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" className="auth-backdrop" onClick={onClose} aria-label="Close account dialog" />
          <motion.section className="auth-modal" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.985 }} transition={{ duration: 0.22 }}>
            <button type="button" className="auth-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
            <span className="auth-eyebrow">MovieFY account</span>
            <h2 id="auth-title">{currentCopy.title}</h2>
            <p>{currentCopy.description}</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              {activeMode !== 'update' ? <label>
                <span>Email</span>
                <span className="auth-field"><AtSign size={15} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" /></span>
              </label> : null}
              {activeMode !== 'reset' ? (
                <label>
                  <span>Password</span>
                  <span className="auth-field"><KeyRound size={15} /><input type="password" minLength={10} autoComplete={activeMode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="10 characters or more" /></span>
                </label>
              ) : null}

              {error ? <div className="auth-feedback error" role="alert">{error}</div> : null}
              {message ? <div className="auth-feedback success"><CheckCircle2 size={15} />{message}</div> : null}

              <button type="submit" className="auth-submit" disabled={busy}>
                {busy ? <Loader2 className="auth-spinner" size={17} /> : null}{currentCopy.action}
              </button>
            </form>

            <div className="auth-switches">
              {activeMode === 'signin' ? <><button type="button" onClick={() => changeMode('signup')}>Create account</button><button type="button" onClick={() => changeMode('reset')}>Forgot password?</button></> : null}
              {activeMode !== 'signin' && activeMode !== 'update' ? <button type="button" onClick={() => changeMode('signin')}>Back to sign in</button> : null}
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
