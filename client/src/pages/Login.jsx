import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const AUTH_STYLES = `
  .auth-root {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    font-family: var(--font-ui);
    padding: 24px;
    transition: background 0.3s ease;
  }

  .auth-card {
    width: 100%;
    max-width: 400px;
    background: var(--color-surface);
    backdrop-filter: var(--blur-glass);
    -webkit-backdrop-filter: var(--blur-glass);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: 40px 36px;
  }

  .auth-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 32px;
  }

  .auth-logo-mark {
    width: 36px;
    height: 36px;
    background: var(--color-accent);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 18px;
    letter-spacing: -1px;
    flex-shrink: 0;
  }

  .auth-logo-name {
    font-size: 17px;
    font-weight: 700;
    color: var(--color-text-1);
    letter-spacing: -0.3px;
  }

  .auth-heading-title {
    font-size: 26px;
    font-weight: 700;
    color: var(--color-text-1);
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }

  .auth-heading-sub {
    font-size: 14px;
    color: var(--color-text-2);
    margin-bottom: 28px;
  }

  .auth-error {
    background: rgba(255, 59, 48, 0.08);
    border: 1px solid rgba(255, 59, 48, 0.2);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    font-size: 13px;
    color: var(--color-danger);
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .auth-field {
    margin-bottom: 14px;
  }

  .auth-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-1);
    margin-bottom: 6px;
  }

  .auth-input {
    width: 100%;
    padding: 11px 14px;
    font-size: 15px;
    font-family: var(--font-ui);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-1);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  .auth-input::placeholder { color: var(--color-text-3); }

  .auth-input:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px var(--color-accent-soft);
  }

  .auth-submit {
    width: 100%;
    margin-top: 8px;
    padding: 13px;
    font-size: 15px;
    font-weight: 600;
    font-family: var(--font-ui);
    background: var(--color-accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: opacity 0.15s;
  }

  .auth-submit:hover:not(:disabled) { opacity: 0.88; }
  .auth-submit:disabled { opacity: 0.45; cursor: not-allowed; }

  .auth-submit-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: auth-spin 0.7s linear infinite;
  }

  @keyframes auth-spin { to { transform: rotate(360deg); } }

  .auth-switch {
    margin-top: 20px;
    text-align: center;
    font-size: 14px;
    color: var(--color-text-2);
  }

  .auth-switch a {
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 500;
  }

  .auth-switch a:hover { text-decoration: underline; }
`;

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{AUTH_STYLES}</style>
      <motion.div
        className="auth-root"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28, delay: 0.05 }}
        >
          <div className="auth-logo">
            <div className="auth-logo-mark">W</div>
            <div className="auth-logo-name">MSWord</div>
          </div>

          <div className="auth-heading-title">Sign in</div>
          <div className="auth-heading-sub">Enter your credentials to continue</div>

          {error && (
            <div className="auth-error">
              <span>&#9888;</span>
              <span>{error}</span>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Email address</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="you@example.com"
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <motion.button
            className="auth-submit"
            onClick={handleSubmit}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? (
              <>
                <span className="auth-submit-spinner" />
                Signing in
              </>
            ) : 'Sign in'}
          </motion.button>

          <div className="auth-switch">
            No account?{' '}
            <Link to="/register">Create one</Link>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
