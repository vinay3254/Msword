# iOS Theme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the entire MSWord app UI with a clean iOS aesthetic — frosted glass surfaces, soft shadows, spring-physics animations, and a persistent light/dark toggle — without touching any business logic or backend.

**Architecture:** A central `theme.css` file defines all design tokens as CSS variables on `[data-theme]` attribute selectors. A `ThemeContext` reads/writes `localStorage` and flips the `data-theme` attribute on `<html>`. Framer Motion provides page transitions via `AnimatePresence` in `App.jsx` and spring physics in individual components. Each page's scoped style constant is replaced wholesale with iOS-token-consuming CSS; all logic (state, handlers, API calls) is untouched.

**Tech Stack:** React 18, React Router v6, Tailwind CSS v3, Framer Motion (to be installed), Google Fonts (Cabinet Grotesk + Fira Code already wired)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `client/src/theme.css` | Create | All iOS design tokens (light + dark) |
| `client/src/context/ThemeContext.jsx` | Create | Theme state, localStorage persistence, `data-theme` toggle |
| `client/index.html` | Modify | Inline script to set `data-theme` before React mounts (flash prevention) |
| `client/src/main.jsx` | Modify | Import `theme.css`, wrap App in `ThemeProvider` |
| `client/src/App.jsx` | Modify | `AnimatePresence` + `AnimatedRoutes` for page transitions |
| `client/src/pages/Login.jsx` | Modify | Replace `AUTH_STYLES` + JSX with iOS centered-card layout |
| `client/src/pages/Register.jsx` | Modify | Replace `AUTH_STYLES` + JSX with iOS centered-card layout |
| `client/src/pages/Dashboard.jsx` | Modify | Replace `DASH_STYLES` with iOS tokens, add framer-motion grid |
| `client/src/pages/Editor.jsx` | Modify | Wrap page shell in `motion.div` for page transition |
| `client/src/components/editor/Ribbon.jsx` | Modify | Replace `RIBBON_CSS` with frosted glass, wrap buttons in `motion.button` |
| `client/src/components/panels/CommentsPanel.jsx` | Modify | Wrap root element in `motion.div` spring slide-in |
| `client/src/components/panels/VersionHistoryPanel.jsx` | Modify | Wrap root element in `motion.div` spring slide-in |

---

## Task 1: Install framer-motion

**Files:**
- Modify: `client/package.json` (via npm install)

- [ ] **Step 1: Install the package**

```bash
cd client && npm install framer-motion
```

Expected output: `added N packages` with `framer-motion` listed. No errors.

- [ ] **Step 2: Verify it appears in package.json**

Open `client/package.json` and confirm `"framer-motion"` is listed under `"dependencies"`.

- [ ] **Step 3: Commit**

```bash
git add client/package.json client/package-lock.json
git commit -m "deps: install framer-motion for iOS spring animations"
```

---

## Task 2: Create iOS design token file

**Files:**
- Create: `client/src/theme.css`

- [ ] **Step 1: Create the file with all tokens**

Create `client/src/theme.css` with this exact content:

```css
/* ── iOS Design Tokens ──────────────────────────────────────────────────── */

[data-theme="light"] {
  --color-bg:          #F2F2F7;
  --color-surface:     #FFFFFF;
  --color-surface-2:   #F2F2F7;
  --color-surface-3:   #E5E5EA;
  --color-border:      rgba(0, 0, 0, 0.08);
  --color-border-hard: rgba(0, 0, 0, 0.14);
  --color-accent:      #007AFF;
  --color-accent-soft: rgba(0, 122, 255, 0.12);
  --color-danger:      #FF3B30;
  --color-success:     #34C759;
  --color-text-1:      #1C1C1E;
  --color-text-2:      #6E6E73;
  --color-text-3:      #AEAEB2;
  --radius-xs:         6px;
  --radius-sm:         8px;
  --radius-md:         12px;
  --radius-lg:         16px;
  --radius-xl:         20px;
  --shadow-xs:         0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-sm:         0 2px 8px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.04);
  --shadow-md:         0 4px 16px rgba(0, 0, 0, 0.10), 0 0 1px rgba(0, 0, 0, 0.04);
  --shadow-lg:         0 8px 32px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.04);
  --blur-glass:        blur(20px) saturate(180%);
}

[data-theme="dark"] {
  --color-bg:          #000000;
  --color-surface:     #1C1C1E;
  --color-surface-2:   #2C2C2E;
  --color-surface-3:   #3A3A3C;
  --color-border:      rgba(255, 255, 255, 0.08);
  --color-border-hard: rgba(255, 255, 255, 0.14);
  --color-accent:      #0A84FF;
  --color-accent-soft: rgba(10, 132, 255, 0.18);
  --color-danger:      #FF453A;
  --color-success:     #30D158;
  --color-text-1:      #FFFFFF;
  --color-text-2:      #8E8E93;
  --color-text-3:      #636366;
  --radius-xs:         6px;
  --radius-sm:         8px;
  --radius-md:         12px;
  --radius-lg:         16px;
  --radius-xl:         20px;
  --shadow-xs:         0 1px 4px rgba(0, 0, 0, 0.4);
  --shadow-sm:         0 2px 10px rgba(0, 0, 0, 0.5), 0 0 1px rgba(0, 0, 0, 0.8);
  --shadow-md:         0 4px 20px rgba(0, 0, 0, 0.6), 0 0 1px rgba(0, 0, 0, 0.8);
  --shadow-lg:         0 8px 40px rgba(0, 0, 0, 0.7), 0 0 1px rgba(0, 0, 0, 0.8);
  --blur-glass:        blur(20px) saturate(180%);
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/theme.css
git commit -m "feat: add iOS design token system (light + dark)"
```

---

## Task 3: Create ThemeContext

**Files:**
- Create: `client/src/context/ThemeContext.jsx`

- [ ] **Step 1: Create the context file**

Create `client/src/context/ThemeContext.jsx`:

```jsx
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

- [ ] **Step 2: Commit**

```bash
git add client/src/context/ThemeContext.jsx
git commit -m "feat: add ThemeContext with localStorage persistence"
```

---

## Task 4: Wire up theme in index.html and main.jsx

**Files:**
- Modify: `client/index.html`
- Modify: `client/src/main.jsx`

- [ ] **Step 1: Add flash-prevention script to index.html**

In `client/index.html`, add an inline script inside `<head>` immediately before the closing `</head>` tag:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MSWord Clone</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='4' fill='%23007AFF'/><text x='4' y='24' font-size='22' fill='white' font-weight='900' font-family='serif'>W</text></svg>" />
    <script>
      (function () {
        var t = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', t);
      })();
    </script>
  </head>
  <body class="m-0 p-0 h-screen overflow-hidden">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Note: the favicon color also changed from `%232b579a` (old blue) to `%23007AFF` (iOS blue).

- [ ] **Step 2: Update main.jsx**

Replace the entire contents of `client/src/main.jsx`:

```jsx
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './theme.css';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
```

- [ ] **Step 3: Commit**

```bash
git add client/index.html client/src/main.jsx
git commit -m "feat: wire ThemeProvider and flash-prevention script"
```

---

## Task 5: Add page transitions in App.jsx

**Files:**
- Modify: `client/src/App.jsx`

- [ ] **Step 1: Replace App.jsx with AnimatedRoutes pattern**

Replace the entire contents of `client/src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login      from './pages/Login';
import Register   from './pages/Register';
import Dashboard  from './pages/Dashboard';
import Editor     from './pages/Editor';
import SharedView from './pages/SharedView';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login"         element={<Login />} />
        <Route path="/register"      element={<Register />} />
        <Route path="/shared/:token" element={<SharedView />} />
        <Route path="/"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route path="/docs/:id"
          element={<ProtectedRoute><Editor /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AnimatedRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat: add AnimatePresence page transitions"
```

---

## Task 6: Redesign Login.jsx with iOS aesthetic

**Files:**
- Modify: `client/src/pages/Login.jsx`

- [ ] **Step 1: Replace AUTH_STYLES constant and add motion import**

The top of `Login.jsx` currently imports from `react` and `react-router-dom`. Add `motion` import and replace `AUTH_STYLES`:

Replace the entire file content with:

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/Login.jsx
git commit -m "feat: redesign Login with iOS centered-card + spring animation"
```

---

## Task 7: Redesign Register.jsx with iOS aesthetic

**Files:**
- Modify: `client/src/pages/Register.jsx`

- [ ] **Step 1: Replace the full file**

Replace the entire contents of `client/src/pages/Register.jsx`:

```jsx
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

export default function Register() {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6)          { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm)         { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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

          <div className="auth-heading-title">Create account</div>
          <div className="auth-heading-sub">Start writing and collaborating today</div>

          {error && (
            <div className="auth-error">
              <span>&#9888;</span>
              <span>{error}</span>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Full name</label>
            <input
              className="auth-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              autoFocus
              autoComplete="name"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Email address</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
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
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Confirm password</label>
            <input
              className="auth-input"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              autoComplete="new-password"
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
                Creating account
              </>
            ) : 'Create account'}
          </motion.button>

          <div className="auth-switch">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/Register.jsx
git commit -m "feat: redesign Register with iOS centered-card + spring animation"
```

---

## Task 8: Redesign Dashboard.jsx with iOS aesthetic

**Files:**
- Modify: `client/src/pages/Dashboard.jsx`

- [ ] **Step 1: Add framer-motion import and useTheme import**

At the top of `Dashboard.jsx`, the current imports are:
```jsx
import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { importDocx } from '../api/exportImport';
```

Replace with:
```jsx
import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import { importDocx } from '../api/exportImport';
```

- [ ] **Step 2: Replace the entire DASH_STYLES constant**

Find the `const DASH_STYLES = \`` block (starts around line 93) and replace it entirely with:

```js
const DASH_STYLES = `
  .dash-root {
    display: flex;
    min-height: 100dvh;
    background: var(--color-bg);
    font-family: var(--font-ui);
    transition: background 0.3s ease;
  }

  /* ── Sidebar ── */
  .dash-sidebar {
    width: 260px;
    flex-shrink: 0;
    background: rgba(255,255,255,0.72);
    backdrop-filter: var(--blur-glass);
    -webkit-backdrop-filter: var(--blur-glass);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100dvh;
    overflow: hidden;
    z-index: 20;
  }

  [data-theme="dark"] .dash-sidebar {
    background: rgba(28,28,30,0.82);
  }

  .dash-brand {
    padding: 24px 20px 18px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .dash-brand-mark {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dash-brand-glyph {
    width: 34px;
    height: 34px;
    background: var(--color-accent);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 18px;
    flex-shrink: 0;
  }

  .dash-brand-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-text-1);
    letter-spacing: -0.3px;
    line-height: 1.1;
  }

  .dash-brand-sub {
    font-size: 11px;
    color: var(--color-text-2);
    margin-top: 1px;
  }

  .dash-greeting {
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .dash-greeting-time {
    font-size: 11px;
    color: var(--color-text-3);
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .dash-greeting-name {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text-1);
    line-height: 1.2;
    letter-spacing: -0.4px;
  }

  .dash-greeting-name strong {
    color: var(--color-accent);
  }

  /* ── Nav ── */
  .dash-nav {
    flex: 1;
    overflow-y: auto;
    padding: 12px 0;
  }

  .dash-nav::-webkit-scrollbar { width: 0; }

  .dash-nav-section {
    padding: 0 12px 8px;
  }

  .dash-nav-label {
    font-size: 11px;
    color: var(--color-text-3);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 4px 8px;
    margin-bottom: 2px;
    font-weight: 500;
  }

  .dash-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    color: var(--color-text-2);
    cursor: pointer;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    transition: background 0.12s, color 0.12s;
    font-family: var(--font-ui);
  }

  .dash-nav-item:hover {
    background: var(--color-surface-2);
    color: var(--color-text-1);
  }

  .dash-nav-item.active {
    background: var(--color-accent-soft);
    color: var(--color-accent);
    font-weight: 500;
  }

  .dash-nav-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    opacity: 0.7;
  }

  .dash-nav-item.active .dash-nav-icon { opacity: 1; }

  /* Folders */
  .dash-folder-input {
    width: 100%;
    padding: 6px 10px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xs);
    font-size: 13px;
    font-family: var(--font-ui);
    color: var(--color-text-1);
    outline: none;
    margin-bottom: 6px;
  }

  .dash-folder-input:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px var(--color-accent-soft);
  }

  /* Sidebar bottom */
  .dash-sidebar-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .dash-user-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dash-user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .dash-user-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-1);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dash-logout-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-3);
    font-size: 16px;
    padding: 4px;
    border-radius: var(--radius-xs);
    transition: color 0.12s, background 0.12s;
    font-family: var(--font-ui);
  }

  .dash-logout-btn:hover {
    color: var(--color-danger);
    background: rgba(255,59,48,0.08);
  }

  /* ── Main area ── */
  .dash-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  /* ── Top bar ── */
  .dash-topbar {
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    padding: 14px 32px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    backdrop-filter: var(--blur-glass);
    -webkit-backdrop-filter: var(--blur-glass);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .dash-topbar-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--color-text-1);
    letter-spacing: -0.3px;
    flex: 1;
  }

  /* Theme toggle */
  .dash-theme-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    cursor: pointer;
    font-size: 13px;
    font-family: var(--font-ui);
    color: var(--color-text-2);
    transition: background 0.15s, color 0.15s;
  }

  .dash-theme-toggle:hover {
    background: var(--color-surface-3);
    color: var(--color-text-1);
  }

  /* New doc button */
  .dash-btn-new {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: var(--color-accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 600;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: opacity 0.15s;
    white-space: nowrap;
  }

  .dash-btn-new:hover { opacity: 0.88; }

  /* Import button */
  .dash-btn-ghost {
    padding: 8px 14px;
    background: var(--color-surface-2);
    color: var(--color-text-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap;
  }

  .dash-btn-ghost:hover {
    background: var(--color-surface-3);
    color: var(--color-text-1);
  }

  /* ── Search ── */
  .dash-search-wrap {
    position: relative;
    flex: 1;
    min-width: 160px;
    max-width: 280px;
  }

  .dash-search {
    width: 100%;
    padding: 8px 12px 8px 32px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: 13px;
    color: var(--color-text-1);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  .dash-search::placeholder { color: var(--color-text-3); }

  .dash-search:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px var(--color-accent-soft);
  }

  .dash-search-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-3);
    font-size: 13px;
    pointer-events: none;
  }

  .dash-search-clear {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--color-text-3);
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    padding: 0;
  }

  /* ── Content area ── */
  .dash-content {
    flex: 1;
    padding: 28px 32px 48px;
    overflow-y: auto;
  }

  /* ── Error ── */
  .dash-error {
    background: rgba(255,59,48,0.06);
    border: 1px solid rgba(255,59,48,0.18);
    border-radius: var(--radius-sm);
    padding: 10px 16px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    color: var(--color-danger);
  }

  /* ── Loading ── */
  .dash-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
    gap: 14px;
  }

  .dash-spinner {
    width: 28px;
    height: 28px;
    border: 2.5px solid var(--color-border-hard);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: dash-spin 0.75s linear infinite;
  }

  @keyframes dash-spin { to { transform: rotate(360deg); } }

  .dash-loading-text {
    font-size: 13px;
    color: var(--color-text-3);
  }

  /* ── Empty state ── */
  .dash-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
    text-align: center;
    gap: 10px;
  }

  .dash-empty-glyph {
    font-size: 56px;
    color: var(--color-text-3);
    line-height: 1;
    margin-bottom: 6px;
  }

  .dash-empty-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-text-1);
    letter-spacing: -0.3px;
  }

  .dash-empty-sub {
    font-size: 14px;
    color: var(--color-text-2);
  }

  /* ── Doc grid ── */
  .dash-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 16px;
  }

  /* ── Doc card ── */
  .dash-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    position: relative;
    overflow: hidden;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .dash-card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--color-border-hard);
  }

  .dash-card-body {
    padding: 12px 14px;
    flex: 1;
  }

  .dash-card-title-wrap {
    margin-bottom: 4px;
  }

  .dash-card-title-input {
    width: 100%;
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font-ui);
    color: var(--color-text-1);
    border: none;
    border-bottom: 2px solid var(--color-accent);
    outline: none;
    background: transparent;
    padding-bottom: 2px;
  }

  .dash-card-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3;
  }

  .dash-card-meta {
    font-size: 11px;
    color: var(--color-text-3);
    margin-top: 3px;
  }

  .dash-card-folder {
    font-size: 11px;
    color: var(--color-text-3);
    margin-top: 2px;
  }

  /* ── Card actions ── */
  .dash-card-actions {
    padding: 0 14px 12px;
    display: flex;
    gap: 6px;
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition: max-height 0.2s ease, opacity 0.2s ease, padding 0.2s ease;
  }

  .dash-card:hover .dash-card-actions {
    max-height: 48px;
    opacity: 1;
  }

  .dash-card-action {
    flex: 1;
    padding: 5px 4px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text-2);
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    border-radius: var(--radius-xs);
    transition: background 0.12s, color 0.12s;
  }

  .dash-card-action:hover { background: var(--color-surface-3); color: var(--color-text-1); }
  .dash-card-action.danger:hover { background: rgba(255,59,48,0.1); color: var(--color-danger); border-color: rgba(255,59,48,0.2); }
  .dash-card-action.restore:hover { background: rgba(52,199,89,0.1); color: var(--color-success); border-color: rgba(52,199,89,0.2); }

  .dash-card-folder-select {
    width: 100%;
    margin-top: 6px;
    padding: 5px 8px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xs);
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--color-text-1);
    cursor: pointer;
    outline: none;
  }

  /* ── Template modal ── */
  .dash-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    backdrop-filter: blur(8px);
  }

  .dash-modal {
    background: var(--color-surface);
    width: 100%;
    max-width: 780px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }

  .dash-modal-header {
    padding: 24px 28px 18px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .dash-modal-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text-1);
    letter-spacing: -0.4px;
  }

  .dash-modal-close {
    background: var(--color-surface-2);
    border: none;
    cursor: pointer;
    font-size: 16px;
    color: var(--color-text-2);
    line-height: 1;
    padding: 6px 10px;
    border-radius: var(--radius-xs);
    transition: background 0.12s, color 0.12s;
  }

  .dash-modal-close:hover {
    background: var(--color-surface-3);
    color: var(--color-text-1);
  }

  .dash-modal-body {
    padding: 20px 28px 28px;
  }

  .dash-template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }

  .dash-template-card {
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 18px 16px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  }

  .dash-template-card:hover {
    background: var(--color-surface-3);
    border-color: var(--color-accent);
    box-shadow: var(--shadow-sm);
  }

  .dash-template-glyph {
    font-size: 20px;
    color: var(--color-accent);
    margin-bottom: 10px;
    font-weight: 700;
  }

  .dash-template-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-1);
    margin-bottom: 4px;
  }

  .dash-template-desc {
    font-size: 11px;
    color: var(--color-text-2);
    line-height: 1.5;
  }

  /* Section headings */
  .dash-section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .dash-section-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-text-1);
    letter-spacing: -0.3px;
  }

  .dash-section-count {
    font-size: 12px;
    color: var(--color-text-3);
  }

  /* Sort/filter bar */
  .dash-filter-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .dash-filter-btn {
    padding: 5px 12px;
    border-radius: 16px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-2);
    font-size: 12px;
    font-family: var(--font-ui);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }

  .dash-filter-btn.active {
    background: var(--color-accent);
    color: #fff;
    border-color: var(--color-accent);
  }

  .dash-filter-btn:not(.active):hover {
    background: var(--color-surface-2);
    color: var(--color-text-1);
  }
`;
```

- [ ] **Step 3: Add motion card variants and useTheme hook in the Dashboard component**

Find the `export default function Dashboard()` function declaration and add `useTheme` inside:

```jsx
export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  // ... rest of existing state declarations unchanged
```

- [ ] **Step 4: Add theme toggle button to the topbar JSX**

Find the `.dash-topbar` JSX in the render. After the `<div className="dash-topbar-title">` element, add the theme toggle button before the search bar:

```jsx
<motion.button
  className="dash-theme-toggle"
  onClick={toggleTheme}
  whileTap={{ scale: 0.96 }}
>
  <motion.span
    animate={{ rotate: theme === 'dark' ? 180 : 0 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    style={{ display: 'inline-block' }}
  >
    {theme === 'dark' ? '☀' : '☾'}
  </motion.span>
  {theme === 'dark' ? 'Light' : 'Dark'}
</motion.button>
```

- [ ] **Step 5: Wrap the document grid in a staggered motion container**

Find the `<div className="dash-grid">` element in the render. Replace it and its direct card children map with:

```jsx
<motion.div
  className="dash-grid"
  variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
  initial="hidden"
  animate="animate"
>
  {filteredDocs.map(doc => (
    <motion.div
      key={doc._id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      whileHover={{ y: -2 }}
      className="dash-card"
      onClick={() => navigate(`/docs/${doc._id}`)}
    >
      {/* keep all existing card inner JSX unchanged */}
    </motion.div>
  ))}
</motion.div>
```

Note: The inner JSX of each card (DocThumbLazy, dash-card-body, dash-card-actions, etc.) stays exactly as-is. Only the outer wrapper `<div className="dash-card">` becomes a `motion.div`.

- [ ] **Step 6: Wrap the new-document button in motion**

Find `<button className="dash-btn-new"` and change it to:

```jsx
<motion.button
  className="dash-btn-new"
  onClick={() => setShowTemplates(true)}
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
>
  + New document
</motion.button>
```

- [ ] **Step 7: Wrap page root in motion.div for page transition**

Find the outermost `<div className="dash-root">` in the return statement and change it to:

```jsx
<motion.div
  className="dash-root"
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
>
```

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/Dashboard.jsx
git commit -m "feat: redesign Dashboard with iOS tokens, framer-motion grid + toggle"
```

---

## Task 9: Update Editor.jsx with motion page wrapper

**Files:**
- Modify: `client/src/pages/Editor.jsx`

- [ ] **Step 1: Add framer-motion import**

Add to the existing imports at the top of `Editor.jsx`:

```jsx
import { motion } from 'framer-motion';
```

- [ ] **Step 2: Wrap the outermost return element**

The Editor's outermost return element is a `<div` with inline style for background/layout. Find it (search for `return (` inside the `Editor` function) and wrap with motion:

```jsx
return (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
             background: 'var(--color-bg)', fontFamily: 'var(--font-ui)' }}
  >
    {/* all existing Editor JSX unchanged */}
  </motion.div>
);
```

Replace the outermost `<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>` with the motion.div above. Keep all children identical.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Editor.jsx
git commit -m "feat: add motion page wrapper to Editor for transitions"
```

---

## Task 10: Redesign Ribbon.jsx with frosted glass + motion buttons

**Files:**
- Modify: `client/src/components/editor/Ribbon.jsx`

- [ ] **Step 1: Add framer-motion import**

Add to existing imports at the top of `Ribbon.jsx`:

```jsx
import { motion } from 'framer-motion';
```

- [ ] **Step 2: Replace the entire RIBBON_CSS constant**

Find `const RIBBON_CSS = \`` and replace entirely with:

```js
const RIBBON_CSS = `
  .rib-root {
    background: var(--color-surface);
    backdrop-filter: var(--blur-glass);
    -webkit-backdrop-filter: var(--blur-glass);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    user-select: none;
  }

  [data-theme="dark"] .rib-root {
    background: rgba(28,28,30,0.88);
  }

  .rib-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border);
    padding: 0 4px;
    background: var(--color-surface-2);
    overflow-x: auto;
  }

  .rib-tabs::-webkit-scrollbar { height: 0; }

  .rib-tab {
    padding: 7px 14px;
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-2);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color 0.12s;
    position: relative;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .rib-tab:hover { color: var(--color-text-1); }

  .rib-tab.active {
    color: var(--color-accent);
    font-weight: 600;
  }

  .rib-tab.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 8px;
    right: 8px;
    height: 2px;
    background: var(--color-accent);
    border-radius: 2px;
  }

  .rib-strip {
    display: flex;
    align-items: stretch;
    flex-wrap: wrap;
    min-height: 50px;
    padding: 4px 2px;
    gap: 0;
    overflow-x: auto;
  }

  .rib-strip::-webkit-scrollbar { height: 0; }

  .rib-group {
    display: flex;
    flex-direction: column;
    padding: 0 6px;
    border-right: 1px solid var(--color-border);
    min-width: max-content;
  }

  .rib-group:last-child { border-right: none; }

  .rib-group-label {
    font-size: 9px;
    color: var(--color-text-3);
    text-align: center;
    padding: 0 2px 1px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .rib-btns {
    display: flex;
    align-items: center;
    gap: 1px;
    flex: 1;
    align-content: center;
    flex-wrap: wrap;
  }

  .rib-btn {
    padding: 4px 6px;
    min-width: 28px;
    min-height: 26px;
    border: none;
    background: transparent;
    color: var(--color-text-1);
    cursor: pointer;
    border-radius: var(--radius-xs);
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    transition: background 0.1s, color 0.1s;
    white-space: nowrap;
    font-family: var(--font-ui);
  }

  .rib-btn:hover {
    background: var(--color-surface-2);
  }

  .rib-btn.active {
    background: var(--color-accent-soft);
    color: var(--color-accent);
  }

  .rib-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .rib-sep {
    width: 1px;
    height: 20px;
    background: var(--color-border);
    margin: 0 3px;
    flex-shrink: 0;
    align-self: center;
  }

  .rib-select {
    padding: 3px 6px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xs);
    font-size: 11px;
    font-family: var(--font-ui);
    color: var(--color-text-1);
    cursor: pointer;
    outline: none;
    height: 26px;
  }

  .rib-select:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px var(--color-accent-soft);
  }

  .rib-color-swatch {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    cursor: pointer;
    flex-shrink: 0;
  }

  /* Color picker popup */
  .rib-color-popup {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 100;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    padding: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    width: 180px;
  }
`;
```

- [ ] **Step 3: Wrap primary toolbar buttons in motion.button**

In the Ribbon JSX, find the main formatting buttons (bold, italic, underline — buttons with `className="rib-btn"` that call `execCmd`). Wrap each with `motion.button` by changing `<button className="rib-btn"` to:

```jsx
<motion.button
  className="rib-btn"
  whileTap={{ scale: 0.92 }}
  // keep all existing props: onClick, title, disabled, etc.
>
```

Do this for all primary action buttons in the strip (bold, italic, underline, align, list, indent, color). Keep `<select>` elements and `<button>` elements that open popups (color picker, image dialog) as-is — only action buttons get the motion treatment.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/editor/Ribbon.jsx
git commit -m "feat: redesign Ribbon with iOS frosted glass + motion buttons"
```

---

## Task 11: Add spring slide-in to CommentsPanel and VersionHistoryPanel

**Files:**
- Modify: `client/src/components/panels/CommentsPanel.jsx`
- Modify: `client/src/components/panels/VersionHistoryPanel.jsx`

- [ ] **Step 1: Update CommentsPanel.jsx**

Add framer-motion import at the top of `CommentsPanel.jsx`:

```jsx
import { motion } from 'framer-motion';
```

Find the outermost `return (` in `CommentsPanel`. It returns a `<div` with panel styling. Wrap it with `motion.div` and add spring slide-in + iOS surface styles:

```jsx
return (
  <motion.div
    initial={{ x: '100%', opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: '100%', opacity: 0 }}
    transition={{ type: 'spring', stiffness: 350, damping: 32 }}
    style={{
      width: 320,
      background: 'var(--color-surface)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)',
      borderLeft: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
      fontFamily: 'var(--font-ui)',
    }}
  >
    {/* all existing CommentsPanel JSX unchanged */}
  </motion.div>
);
```

Replace whatever the existing outermost `<div` style was with the motion.div above. All children stay identical.

- [ ] **Step 2: Update VersionHistoryPanel.jsx**

Add framer-motion import at the top of `VersionHistoryPanel.jsx`:

```jsx
import { motion } from 'framer-motion';
```

Find the outermost `return (` in `VersionHistoryPanel`. Apply the same spring slide-in pattern:

```jsx
return (
  <motion.div
    initial={{ x: '100%', opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: '100%', opacity: 0 }}
    transition={{ type: 'spring', stiffness: 350, damping: 32 }}
    style={{
      width: 320,
      background: 'var(--color-surface)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)',
      borderLeft: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
      fontFamily: 'var(--font-ui)',
    }}
  >
    {/* all existing VersionHistoryPanel JSX unchanged */}
  </motion.div>
);
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/panels/CommentsPanel.jsx client/src/components/panels/VersionHistoryPanel.jsx
git commit -m "feat: add spring slide-in animation to side panels"
```

---

## Task 12: Update index.css to remove conflicting hard-coded colors

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Replace hard-coded background colors with token references**

In `client/src/index.css`, find and update these specific rules:

**a) editor-pages-container background:**
```css
.editor-pages-container {
  /* change: background: #f0f0f0; */
  background: var(--color-bg);
  /* keep all other properties */
}
```

**b) table context menu and spell context menu — update background/border to use tokens:**
```css
.table-context-menu {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  /* keep border-radius, box-shadow, padding */
}

.table-context-menu button:hover {
  background: var(--color-accent-soft);
}

.spell-context-menu {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.spell-context-menu button:hover {
  background: var(--color-accent-soft);
}
```

**c) ribbon-btn.active:**
```css
.ribbon-btn.active {
  background: var(--color-accent-soft) !important;
  color: var(--color-accent) !important;
  border: 1px solid rgba(0, 122, 255, 0.3) !important;
}
```

**d) ruler:**
```css
.ruler {
  background: var(--color-surface-2);
  border-bottom: 1px solid var(--color-border);
  /* keep height, position, overflow, user-select, font-size, color, flex-shrink */
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/index.css
git commit -m "feat: update index.css to use iOS design tokens"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Design token system (`theme.css`) — Task 2
- ✅ ThemeContext with localStorage — Task 3
- ✅ Flash prevention + main.jsx wiring — Task 4
- ✅ Page transitions (AnimatePresence) — Task 5
- ✅ Login iOS redesign + motion — Task 6
- ✅ Register iOS redesign + motion — Task 7
- ✅ Dashboard iOS redesign + framer-motion grid + theme toggle — Task 8
- ✅ Editor motion wrapper — Task 9
- ✅ Ribbon frosted glass + motion buttons — Task 10
- ✅ CommentsPanel spring slide-in — Task 11
- ✅ VersionHistoryPanel spring slide-in — Task 11
- ✅ index.css token cleanup — Task 12

**No placeholders found.** All tasks contain complete code.

**Type consistency:** CSS variable names (`--color-accent`, `--color-surface`, etc.) match exactly between `theme.css` (Task 2) and all consuming files. `useTheme` hook exported from `ThemeContext.jsx` (Task 3) matches usage in `Dashboard.jsx` (Task 8). `motion` import from `framer-motion` consistent across all tasks.
