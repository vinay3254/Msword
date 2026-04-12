# iOS Theme Redesign — Design Spec
**Date:** 2026-04-12
**Scope:** Full app — Dashboard, Login/Register, Editor chrome, side panels
**Skills applied:** frontend-design, taste-skill (Leonxlnx/taste-skill)

---

## 1. Goals

- Rebuild the entire UI with a clean iOS aesthetic: frosted glass, soft shadows, rounded corners, spring physics animations
- Support light mode (`#F2F2F7` base) and dark mode (`#000000` base) with a persistent toggle
- Replace the current editorial dark theme (Fraunces/amber) across all pages with a cohesive iOS system
- Retain Cabinet Grotesk + Fira Code typography (set in prior session)
- Achieve "go all in" animation: page transitions, staggered card reveals, spring panel slide-ins, tactile button feedback

---

## 2. taste-skill Dial Settings

| Dial             | Value | Rationale                                      |
|------------------|-------|------------------------------------------------|
| DESIGN_VARIANCE  | 5     | Clean, balanced — iOS is structured not chaotic |
| MOTION_INTENSITY | 7     | Spring physics throughout, staggered reveals    |
| VISUAL_DENSITY   | 3     | Airy iOS spacing, generous negative space       |

---

## 3. Design Token Architecture

### New file: `client/src/theme.css`

All tokens defined under `[data-theme="light"]` and `[data-theme="dark"]` attribute selectors on `<html>`.

| Token                | Light              | Dark                        |
|----------------------|--------------------|-----------------------------|
| `--color-bg`         | `#F2F2F7`          | `#000000`                   |
| `--color-surface`    | `#FFFFFF`          | `#1C1C1E`                   |
| `--color-surface-2`  | `#F2F2F7`          | `#2C2C2E`                   |
| `--color-border`     | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)`    |
| `--color-accent`     | `#007AFF`          | `#007AFF`                   |
| `--color-text-1`     | `#1C1C1E`          | `#FFFFFF`                   |
| `--color-text-2`     | `#6E6E73`          | `#8E8E93`                   |
| `--radius-sm`        | `8px`              | same                        |
| `--radius-md`        | `12px`             | same                        |
| `--radius-lg`        | `16px`             | same                        |
| `--shadow-card`      | `0 2px 8px rgba(0,0,0,0.08)` | `0 2px 16px rgba(0,0,0,0.5)` |
| `--blur-glass`       | `blur(20px) saturate(180%)` | same                  |

### New file: `client/src/context/ThemeContext.jsx`

- React context exposing `{ theme, toggleTheme }`
- Reads initial value from `localStorage.getItem('theme')`, defaults to `"light"`
- On toggle: flips `data-theme` attribute on `document.documentElement`, writes to `localStorage`

### Modified: `client/src/main.jsx`

- Import `theme.css`
- Wrap `<App>` with `<ThemeProvider>`
- Set initial `data-theme` on `<html>` before first render (avoids flash)

---

## 4. Per-Surface Design

### Login / Register
- Full-screen background: `var(--color-bg)`
- Centered frosted glass card: `backdrop-filter: var(--blur-glass)`, `background: var(--color-surface)` at 85% opacity, `border-radius: var(--radius-lg)`, `border: 1px solid var(--color-border)`, `box-shadow: var(--shadow-card)`
- Inputs: `var(--radius-sm)` radius, `var(--color-surface-2)` fill, blue focus ring (`outline: 2px solid var(--color-accent)`)
- CTA button: `var(--color-accent)` fill, white text, `var(--radius-sm)`
- Completely replaces current `AUTH_STYLES` editorial dark aesthetic

### Dashboard
- Sidebar: `var(--color-surface)` at 80% opacity + `backdrop-filter: var(--blur-glass))`, hairline `var(--color-border)` right border, `position: sticky`
- Brand mark: replaces amber glyph with clean `#007AFF` rounded square
- Document grid: 3-column, `var(--radius-md)` cards, `var(--shadow-card)` elevation
- Theme toggle: pill-shaped button top-right of header, sun/moon icon with spring rotation
- New document button: `#007AFF` fill with `whileTap` press feedback
- Completely replaces current `DASH_STYLES` dark theme

### Editor Page
- Page wrapper: `background: var(--color-bg)` (replaces hard-coded `#f0f0f0`)
- Motion wrapper for page-level transition

### Ribbon
- Background: `var(--color-surface)` at 90% opacity + `backdrop-filter: var(--blur-glass)`
- Border bottom: `var(--color-border)`
- All toolbar buttons: `motion.button` with `whileHover={{ scale: 1.02 }}` + `whileTap={{ scale: 0.97 }}`
- Active state: `var(--color-accent)` tinted background

### Side Panels (Comments, Version History)
- Spring slide-in from right: `initial={{ x: '100%' }}` → `animate={{ x: 0 }}`
- Background: `var(--color-surface)` + `backdrop-filter: var(--blur-glass)`
- Border left: `var(--color-border)`

---

## 5. Animation System

**Dependency:** `framer-motion` — must be installed before implementation:
```
npm install framer-motion
```
(Not in `client/package.json` — confirmed missing)

### Page Transitions
- `<AnimatePresence>` wraps routes in `App.jsx`
- Each page: `initial={{ opacity: 0, y: 8 }}` → `animate={{ opacity: 1, y: 0 }}` → `exit={{ opacity: 0, y: -8 }}`
- `transition: { type: 'spring', stiffness: 400, damping: 30 }`

### Dashboard Card Grid (staggered waterfall)
```js
// Parent motion.div
variants={{ hidden: {}, animate: { transition: { staggerChildren: 0.06 } } }}

// Each card motion.div
variants={{
  hidden: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
}}
transition={{ type: 'spring', stiffness: 300, damping: 24 }}
```

### Panel Slide-ins
```js
initial={{ x: '100%', opacity: 0 }}
animate={{ x: 0, opacity: 1 }}
exit={{ x: '100%', opacity: 0 }}
transition={{ type: 'spring', stiffness: 350, damping: 32 }}
```

### Theme Toggle Icon
```js
animate={{ rotate: isDark ? 180 : 0, scale: [1, 0.8, 1] }}
transition={{ type: 'spring', stiffness: 300 }}
```

### Universal Button Feedback
- All interactive buttons: `motion.button` with `whileHover={{ scale: 1.02 }}` + `whileTap={{ scale: 0.97 }}`

### taste-skill Guardrails
- Animate `transform` and `opacity` only — never `top`, `left`, `width`, `height`
- No `window.addEventListener('scroll')` — use framer's `useScroll` if needed
- No mixing GSAP/ThreeJS — framer-motion only throughout

---

## 6. File Changeset

| File | Action |
|------|--------|
| `client/src/theme.css` | **Create** — all iOS design tokens |
| `client/src/context/ThemeContext.jsx` | **Create** — theme toggle context |
| `client/src/main.jsx` | **Modify** — ThemeProvider wrap, import theme.css |
| `client/src/App.jsx` | **Modify** — AnimatePresence around routes |
| `client/src/index.css` | **Modify** — remove conflicting hard-coded colors |
| `client/src/pages/Login.jsx` | **Modify** — full AUTH_STYLES iOS rewrite |
| `client/src/pages/Register.jsx` | **Modify** — full iOS treatment matching Login |
| `client/src/pages/Dashboard.jsx` | **Modify** — full DASH_STYLES iOS rewrite + motion |
| `client/src/pages/Editor.jsx` | **Modify** — motion wrapper, theme-aware background |
| `client/src/components/editor/Ribbon.jsx` | **Modify** — frosted glass, motion.button |
| `client/src/components/panels/CommentsPanel.jsx` | **Modify** — spring slide-in |
| `client/src/components/panels/VersionHistoryPanel.jsx` | **Modify** — spring slide-in |

**Not touched:** server code, API files, hooks, `[contenteditable]` document area

---

## 7. Out of Scope

- Document content typography (user-controlled via ribbon font picker)
- Backend / API changes
- Mobile responsive breakpoints (existing layout preserved)
- Modals not listed above (ImageDialog, SymbolPicker — can be done in a follow-up)
