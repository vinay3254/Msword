import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const AUTH_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,300;1,9..144,400&family=Fira+Code:wght@400;500&display=swap');

  .auth-root {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0e0e0f;
    font-family: 'Fira Code', monospace;
    padding: 24px;
    position: relative;
    overflow: hidden;
  }

  /* Subtle background texture */
  .auth-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 60% 50% at 20% 20%, rgba(232, 180, 41, 0.04) 0%, transparent 60%),
      radial-gradient(ellipse 50% 40% at 80% 80%, rgba(232, 180, 41, 0.03) 0%, transparent 60%);
    pointer-events: none;
  }

  .auth-card {
    width: 100%;
    max-width: 400px;
    background: #161618;
    border: 1px solid #222224;
    border-radius: 12px;
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.03),
      0 8px 32px rgba(0, 0, 0, 0.6),
      0 2px 8px rgba(0, 0, 0, 0.4);
    padding: 40px 36px;
    position: relative;
  }

  /* Top accent line */
  .auth-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 36px;
    right: 36px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(232, 180, 41, 0.4), transparent);
    border-radius: 0 0 1px 1px;
  }

  .auth-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 36px;
  }

  .auth-logo-mark {
    width: 36px;
    height: 36px;
    background: #e8b429;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Fraunces', serif;
    font-weight: 700;
    font-size: 20px;
    color: #0e0e0f;
    letter-spacing: -1px;
    flex-shrink: 0;
    clip-path: polygon(0 0, 100% 0, 100% 80%, 85% 100%, 0 100%);
  }

  .auth-logo-name {
    font-family: 'Fraunces', serif;
    font-size: 16px;
    font-weight: 500;
    color: #f5f2eb;
    letter-spacing: -0.3px;
    line-height: 1.1;
  }

  .auth-logo-sub {
    font-size: 9px;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-top: 1px;
    font-family: 'Fira Code', monospace;
  }

  .auth-heading-title {
    font-family: 'Fraunces', serif;
    font-size: 28px;
    font-weight: 300;
    font-style: italic;
    color: #f5f2eb;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
    line-height: 1.1;
  }

  .auth-heading-title strong {
    font-weight: 700;
    font-style: normal;
    color: #e8b429;
  }

  .auth-heading-sub {
    font-size: 11px;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 32px;
  }

  .auth-error {
    background: rgba(255, 60, 48, 0.07);
    border: 1px solid rgba(255, 60, 48, 0.2);
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 12px;
    color: #ff6b63;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Fira Code', monospace;
  }

  .auth-field {
    margin-bottom: 16px;
  }

  .auth-label {
    display: block;
    font-size: 9.5px;
    font-weight: 500;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 8px;
    font-family: 'Fira Code', monospace;
  }

  .auth-input {
    width: 100%;
    padding: 11px 14px;
    font-size: 13px;
    font-family: 'Fira Code', monospace;
    background: #0e0e0f;
    border: 1px solid #252527;
    border-radius: 6px;
    color: #f5f2eb;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  .auth-input::placeholder {
    color: #333;
  }

  .auth-input:focus {
    border-color: #e8b429;
    box-shadow: 0 0 0 3px rgba(232, 180, 41, 0.08);
  }

  .auth-submit {
    width: 100%;
    margin-top: 8px;
    padding: 12px;
    font-size: 12px;
    font-weight: 500;
    font-family: 'Fira Code', monospace;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    background: #e8b429;
    color: #0e0e0f;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: opacity 0.15s, background 0.15s;
    clip-path: polygon(0 0, 100% 0, 100% 75%, 98% 100%, 0 100%);
  }

  .auth-submit:hover:not(:disabled) {
    background: #f0c040;
  }

  .auth-submit:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .auth-submit-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(14, 14, 15, 0.25);
    border-top-color: #0e0e0f;
    border-radius: 50%;
    animation: auth-spin 0.7s linear infinite;
  }

  @keyframes auth-spin { to { transform: rotate(360deg); } }

  .auth-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 20px 0 0;
  }

  .auth-divider-line {
    flex: 1;
    height: 1px;
    background: #1e1e20;
  }

  .auth-divider-text {
    font-size: 10px;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }

  .auth-switch {
    margin-top: 16px;
    text-align: center;
    font-size: 11px;
    color: #555;
    font-family: 'Fira Code', monospace;
  }

  .auth-switch a {
    color: #e8b429;
    text-decoration: none;
    font-weight: 500;
  }

  .auth-switch a:hover {
    color: #f0c040;
  }
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30, delay: 0.05 }}
        >
          <div className="auth-logo">
            <div className="auth-logo-mark">W</div>
            <div>
              <div className="auth-logo-name">MSWord</div>
              <div className="auth-logo-sub">Document Studio</div>
            </div>
          </div>

          <div className="auth-heading-title">
            Welcome <strong>back</strong>
          </div>
          <div className="auth-heading-sub">Sign in to your workspace</div>

          {error && (
            <div className="auth-error">
              <span>&#9888;</span>
              <span>{error}</span>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Email</label>
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
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? (
              <>
                <span className="auth-submit-spinner" />
                Signing in
              </>
            ) : 'Sign in'}
          </motion.button>

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-text">or</span>
            <div className="auth-divider-line" />
          </div>

          <div className="auth-switch">
            No account?{' '}
            <Link to="/register">Create one</Link>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
