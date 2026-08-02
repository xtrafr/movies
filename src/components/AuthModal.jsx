import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Download, KeyRound, Loader2, ShieldCheck, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const copy = {
  signin: { title: 'Welcome back', description: 'Use your username and password.', action: 'Sign in' },
  signup: { title: 'Create account', description: 'No email or confirmation needed.', action: 'Create account' },
  recover: { title: 'Recover account', description: 'Use one unused backup code to set a new password.', action: 'Change password' },
  codes: { title: 'Save backup codes', description: 'Download these now. They are shown only once.' },
};

function friendlyError(error) {
  if (error?.status === 429) return 'Too many attempts. Wait a little, then try again.';
  return error?.message || 'Something went wrong. Please try again.';
}

export default function AuthModal({ open, onClose }) {
  const { configured, signIn, signUp, recoverAccount } = useAuth();
  const [mode, setMode] = useState('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canClose = mode !== 'codes';

  const closeModal = useCallback(() => {
    setMode('signin');
    setUsername('');
    setPassword('');
    setRecoveryCode('');
    setRecoveryCodes([]);
    setDownloaded(false);
    setCopied(false);
    setError('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open || !canClose) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [canClose, closeModal, open]);

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setPassword('');
    setRecoveryCode('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!configured) {
      setError('Account sync is not configured in this environment.');
      return;
    }
    if (password.length < 12 || password.length > 128) {
      setError('Use a password between 12 and 128 characters.');
      return;
    }

    setBusy(true);
    const result = mode === 'signin'
      ? await signIn(username, password)
      : mode === 'signup'
        ? await signUp(username, password)
        : await recoverAccount(username, recoveryCode, password);
    setBusy(false);

    if (result.error) {
      setError(friendlyError(result.error));
      return;
    }
    if (mode === 'signup') {
      setRecoveryCodes(result.data.recoveryCodes);
      setMode('codes');
      return;
    }
    closeModal();
  };

  const backupFile = `MovieFY backup codes\n\nUsername: ${username.trim().toLowerCase()}\nCreated: ${new Date().toISOString()}\n\n${recoveryCodes.join('\n')}\n\nEach code works once. Keep this file private.\n`;

  const downloadCodes = () => {
    const url = URL.createObjectURL(new Blob([backupFile], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `moviefy-${username.trim().toLowerCase()}-backup-codes.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  const copyCodes = async () => {
    await navigator.clipboard.writeText(backupFile);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const currentCopy = copy[mode];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" className="auth-backdrop" onClick={canClose ? closeModal : undefined} aria-label="Close account dialog" />
          <motion.section className={`auth-modal ${mode === 'codes' ? 'auth-codes-modal' : ''}`} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.985 }} transition={{ duration: 0.22 }}>
            {canClose ? <button type="button" className="auth-close" onClick={closeModal} aria-label="Close"><X size={18} /></button> : null}
            <span className="auth-eyebrow">MovieFY account</span>
            <h2 id="auth-title">{currentCopy.title}</h2>
            <p>{currentCopy.description}</p>

            {mode === 'codes' ? (
              <div className="auth-codes">
                <div className="auth-code-grid" aria-label="Backup codes">
                  {recoveryCodes.map((code) => <code key={code}>{code}</code>)}
                </div>
                <div className="auth-code-actions">
                  <button type="button" className="auth-secondary" onClick={copyCodes}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy'}</button>
                  <button type="button" className="auth-submit" onClick={downloadCodes}><Download size={16} />Download codes</button>
                </div>
                <div className="auth-backup-note"><ShieldCheck size={16} />MovieFY stores only protected hashes. These codes cannot be shown again.</div>
                <button type="button" className="auth-saved" disabled={!downloaded} onClick={closeModal}>{downloaded ? 'I saved my codes' : 'Download the codes to continue'}</button>
              </div>
            ) : (
              <>
                <form className="auth-form" onSubmit={handleSubmit}>
                  <label>
                    <span>Username</span>
                    <span className="auth-field"><UserRound size={15} /><input type="text" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" autoCapitalize="none" autoCorrect="off" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required placeholder="your_username" /></span>
                  </label>
                  {mode === 'recover' ? <label>
                    <span>Backup code</span>
                    <span className="auth-field"><ShieldCheck size={15} /><input type="text" autoCapitalize="characters" autoComplete="off" value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} required placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" /></span>
                  </label> : null}
                  <label>
                    <span>{mode === 'recover' ? 'New password' : 'Password'}</span>
                    <span className="auth-field"><KeyRound size={15} /><input type="password" minLength={12} maxLength={128} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="12 characters or more" /></span>
                  </label>

                  {error ? <div className="auth-feedback error" role="alert">{error}</div> : null}

                  <button type="submit" className="auth-submit" disabled={busy}>
                    {busy ? <Loader2 className="auth-spinner" size={17} /> : null}{currentCopy.action}
                  </button>
                </form>

                <div className="auth-switches">
                  {mode === 'signin' ? <><button type="button" onClick={() => changeMode('signup')}>Create account</button><button type="button" onClick={() => changeMode('recover')}>Use backup code</button></> : null}
                  {mode !== 'signin' ? <button type="button" onClick={() => changeMode('signin')}>Back to sign in</button> : null}
                </div>
              </>
            )}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
