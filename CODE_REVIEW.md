# MSWord Clone — Full Codebase Review Report
**Date:** 2026-04-12  
**Reviewer:** Claude Sonnet 4.6  
**Scope:** All source files — server + client

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Summary](#architecture-summary)
3. [Critical Issues](#critical-issues-must-fix)
4. [Security Analysis](#security-analysis)
5. [Functional Issues & Bugs](#functional-issues--bugs)
6. [Code Quality](#code-quality)
7. [Performance Considerations](#performance-considerations)
8. [Feature Completeness Checklist](#feature-completeness-checklist)
9. [Recommendations Summary](#recommendations-summary)

---

## Project Overview

A full-stack Microsoft Word-like document editor with:
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Express.js + MongoDB (Mongoose)
- **Real-time:** Socket.IO for collaborative editing
- **Auth:** JWT (7-day expiry, stored in localStorage)
- **Features:** CRUD docs, versioning, comments, sharing, export (DOCX/PDF), image upload, track changes, spell check, TOC, headers/footers

---

## Architecture Summary

```
/
├── MSWord.jsx          ← 38KB monolithic legacy file (dead code, not used)
├── index.html          ← legacy standalone HTML (not used by app)
├── package.json        ← root orchestrator (concurrently)
├── server/             ← Express API
│   ├── index.js        ← Server entry (helmet, cors, rate limit, socket.io)
│   ├── middleware/auth.js
│   ├── models/         ← User, Document, Version, Comment
│   └── routes/         ← auth, docs, versions, comments, share, upload, export
└── client/
    └── src/
        ├── api/         ← axios wrappers
        ├── hooks/       ← useEditor, useCollaboration
        ├── pages/       ← Dashboard, Editor, Login, Register, SharedView
        └── components/  ← Ribbon, Ruler, modals, panels
```

The proxy in `vite.config.js` forwards `/api` and `/socket.io` to `localhost:5000`, so the
frontend never hard-codes the server URL in dev. This is correct.

---

## Critical Issues (Must Fix)

### 🔴 CRIT-1 — Weak JWT Secret Committed to Git

**File:** `server/.env` (line 2)
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```
This is the default placeholder. Since `.env` is committed (it appears in git status as `M server/.env`), any attacker can forge valid JWT tokens and impersonate any user.

**Fix:** Generate a real secret (`openssl rand -base64 64`) and never commit `.env` files.

---

### 🔴 CRIT-2 — Missing `CLIENT_ORIGIN` in `server/.env`

**File:** `server/routes/share.js` (lines 13–16)
```js
const clientOrigin = process.env.CLIENT_ORIGIN;
if (!clientOrigin) {
  return res.status(500).json({ message: 'Server configuration error: CLIENT_ORIGIN is not set' });
}
```
`server/.env` does NOT define `CLIENT_ORIGIN`. Every call to generate a share link will return HTTP 500.

**Fix:** Add `CLIENT_ORIGIN=http://localhost:5173` to `server/.env`.

---

### 🔴 CRIT-3 — Missing `SERVER_ORIGIN` in `server/.env`

**File:** `server/routes/upload.js` (line 33)
```js
const origin = process.env.SERVER_ORIGIN || 'http://localhost:5000';
```
`SERVER_ORIGIN` is not in `server/.env`. In production this would return wrong URLs.

**Fix:** Add `SERVER_ORIGIN=http://localhost:5000` to `server/.env` (and update for production).

---

### 🔴 CRIT-4 — Regex Injection / ReDoS in Document Search

**File:** `server/routes/docs.js` (lines 19–21)
```js
const filter = search
  ? { ...base, title: { $regex: search, $options: 'i' }, ... }
```
The `search` query parameter is passed directly into a MongoDB `$regex` without escaping. An attacker can send a catastrophic backtracking pattern (e.g., `(a+)+$`) and cause MongoDB CPU spikes (ReDoS).

**Fix:**
```js
const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const filter = { ...base, title: { $regex: escapedSearch, $options: 'i' }, ... };
```

---

### 🔴 CRIT-5 — PDF Export Injects Unsanitized HTML (XSS in Puppeteer)

**File:** `server/routes/export.js` (lines 110–111)
```js
${headerHTML ? `<div class="doc-header">${headerHTML}</div>` : ''}
${doc.content || '<p></p>'}
${footerHTML ? `<div class="doc-footer">${footerHTML}</div>` : ''}
```
`headerHTML`, `footerHTML`, and `doc.content` are injected into the Puppeteer HTML page without server-side sanitization. A malicious document could embed `<script>` tags that execute during PDF rendering. Puppeteer runs a real Chromium instance — this is effectively an SSRF/XSS vector if Chromium has access to internal network resources.

**Fix:** Sanitize with a server-side library (e.g., `sanitize-html`) before injecting into the Puppeteer template.

---

## Security Analysis

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| CRIT-1 | 🔴 Critical | Weak JWT secret committed to git | `server/.env` |
| CRIT-4 | 🔴 Critical | ReDoS via unchecked regex in doc search | `routes/docs.js:20` |
| CRIT-5 | 🔴 Critical | Unsanitized HTML injected into Puppeteer | `routes/export.js:110` |
| SEC-1 | 🟠 High | Uploaded files served publicly without auth | `server/index.js:54` |
| SEC-2 | 🟠 High | JWT stored in `localStorage` (XSS-accessible) | `client/api/axios.js:11` |
| SEC-3 | 🟡 Medium | No cleanup of uploaded images when doc deleted | `routes/upload.js` |
| SEC-4 | 🟡 Medium | Comment `anchorId` not validated (arbitrary string stored) | `routes/comments.js:92` |
| SEC-5 | 🟢 Low | No rate limiting on non-auth API routes | `server/index.js:57-63` |

### SEC-1 — Uploaded images accessible without authentication
`app.use('/uploads', express.static(...))` serves all uploaded images to anyone with the filename. Filenames are `timestamp-random.ext` so guessing is hard, but the files are still public.

**Fix:** Route image requests through an auth-gated endpoint, or use signed URLs if using cloud storage.

### SEC-2 — JWT in localStorage
Tokens in localStorage are accessible to any JavaScript on the page (XSS). Storing in an `HttpOnly` cookie is safer, though it requires CSRF protection.

### SEC-3 — Orphaned uploads
When a document is permanently deleted (`DELETE /api/docs/:id/permanent`), the server deletes the Document and its Versions but never removes images uploaded to `server/uploads/`. Over time the uploads directory grows unboundedly.

---

## Functional Issues & Bugs

### 🐛 BUG-1 — Share link always returns HTTP 500 (see CRIT-2)

Share link generation is completely broken until `CLIENT_ORIGIN` is added to `server/.env`.

---

### 🐛 BUG-2 — SharedView edit mode saves nothing

**File:** `client/src/pages/SharedView.jsx` (line 95)
```jsx
contentEditable={isEdit}
```
When `sharePermission === 'edit'`, the document is editable. The footer says:
> "You are editing this shared document. Changes are not saved automatically."

But there is **no save button, no auto-save, and no API call**. Edits are silently discarded on page refresh. This is a feature gap — either implement saving or change `sharePermission='edit'` to only mean viewing.

---

### 🐛 BUG-3 — CommentsPanel loads comments twice on mount

**File:** `client/src/components/panels/CommentsPanel.jsx` (lines 29–67)

There are two `useEffect` hooks:
1. First effect (lines 29–46): runs when `collaboratorsProp` changes. If `collaboratorsProp.length > 0`, it only sets collaborators and returns early — **never loads comments**.
2. Second effect (lines 48–66): always runs on mount, loads comments and extracts collaborators from comment authors.

This means:
- When `collaboratorsProp` is provided AND has items, the first effect bails out early (no comment load), but the second effect loads comments anyway — result: double render, but functionally OK.
- When `collaboratorsProp` is empty, the first effect still attempts to fetch comments (before comments load in effect 2) via... wait, it doesn't — it just returns early if `collaboratorsProp.length` is truthy. The actual comment fetch lives only in the second effect.

**Net result:** Comments always load (from effect 2). But the first effect's logic is confusing and the `collaboratorsProp` dependency in effect 1 causes a stale state issue — if `collaboratorsProp` is an inline array `[]` created on each render, both effects trigger on every parent render.

---

### 🐛 BUG-4 — `useCollaboration` ESLint suppression hides missing dependencies

**File:** `client/src/hooks/useCollaboration.js` (line 100)
```js
}, [docId, token]); // eslint-disable-line
```
The suppressed deps are `onRemoteUpdate` and `onUsersChange`. These are callback props passed from `Editor.jsx`. If they change identity between renders (new arrow function each render), the socket won't re-subscribe with the new callbacks — the old stale closures are used. This can cause bugs where new collaborators' updates don't appear.

**Fix:** Wrap the callbacks in `useCallback` in `Editor.jsx` before passing to `useCollaboration`, then safely add them to the dependency array.

---

### 🐛 BUG-5 — `document.execCommand` is deprecated

**File:** `client/src/hooks/useEditor.js` (used in `exec`, `insertHTML`, `applyHeading`, `handlePaste`)

`document.execCommand()` is officially deprecated by the W3C and WHATWG. Modern Chromium prints warnings. It still works in all current browsers but may break in future versions (especially Firefox and Safari have already restricted some commands).

**Risk:** Medium-term browser compatibility issue. No immediate breakage, but will eventually need migration to a proper rich text library (Quill, ProseMirror, Tiptap, Slate).

---

### 🐛 BUG-6 — Track Changes panel button exists in Ribbon but TC actions not persisted

Track changes marks up content with `.tc-ins`/`.tc-del` spans. These are stripped with `stripTrackControlsFromHTML()` before saving. If a user reviews and accepts/rejects changes, the accepted content is saved. However, if a collaborator sends a `doc-updated` socket event while track changes is on for the current user, the remote update calls `onRemoteUpdate` which calls `ed.setHTML()` (DOMPurify-sanitized) — this wipes any pending tracked changes in the editor. This is a known limitation but could confuse users.

---

### 🐛 BUG-7 — `insertLink` uses unsanitized URL in `exec('createLink', url)`

**File:** `client/src/hooks/useEditor.js` (line 162)
```js
exec('createLink', url);
```
If the URL is `javascript:alert(1)`, this inserts a `javascript:` link. `insertHTML` uses DOMPurify but `exec('createLink')` bypasses it.

**Fix:**
```js
const safeUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
exec('createLink', safeUrl);
```

---

### 🐛 BUG-8 — Version history capped at 30 but also limited to 30 in GET

**File:** `server/routes/versions.js` (line 20) and `server/models/Version.js` (line 24)

The `createAndTrim` static keeps ≤ 30 versions per document, and the GET also has `.limit(30)`. This is intentionally consistent. ✅ No bug — just noting for awareness.

---

## Code Quality

### ✅ What's Done Well

| Area | Notes |
|------|-------|
| **Auth middleware** | Clean JWT verify + DB user lookup, proper 401 responses |
| **Password hashing** | bcrypt with cost factor 12 — good |
| **Input validation** | `express-validator` used on all write endpoints |
| **Helmet** | CSP, frame ancestors, object-src all configured |
| **Rate limiting** | Auth routes have a 20 req/15min limiter |
| **Soft delete** | Documents use `deleted: true` + 30-day auto-purge cron — well designed |
| **Error handling** | CastError caught globally in all routes |
| **Socket auth** | JWT verified before socket handshake — correct |
| **DOMPurify** | Used client-side on all HTML insertion and render |
| **Lazy loading** | `DocThumbLazy` in Dashboard uses IntersectionObserver — good |
| **Version trimming** | `createAndTrim` static keeps DB clean |

---

### ⚠️ Code Smell / Style Issues

#### STYLE-1 — Duplicate `lastModified` + Mongoose timestamps
**File:** `server/models/Document.js`
```js
lastModified: { type: Date, default: Date.now, index: true },
// ...
{ timestamps: true }  // adds createdAt + updatedAt
```
The `timestamps: true` option adds `updatedAt` which is functionally identical to `lastModified`. The pre-save hook then manually sets `lastModified` anyway. This is redundant — `updatedAt` and `lastModified` will always be the same value.

**Fix:** Remove `lastModified` field and the pre-save hook; use `updatedAt` everywhere instead.

---

#### STYLE-2 — Dead code at project root

**Files:** `MSWord.jsx` (38KB), `index.html` at project root

These appear to be the original monolithic prototype. The app now uses `client/src/`. These files are not imported anywhere and add confusion.

**Fix:** Delete or move to an `archive/` folder.

---

#### STYLE-3 — `handleInput` in `useEditor.js` does nothing

**File:** `client/src/hooks/useEditor.js` (line 243)
```js
const handleInput = useCallback(() => {
  // Debounced history push is handled externally by Editor.jsx via onInput
}, []);
```
This is an empty callback that's exported and wired up in `Editor.jsx`. The comment says "handled externally" but this creates confusion — it makes callers think they're registering an input handler when they're not.

---

#### STYLE-4 — Inconsistent margin conversion logic

The server (`routes/export.js`) uses `cm` units for margins; the client (`Editor.jsx`) uses `px` and converts with `pxToCm` / `cmToPx`. Both define a `PRESET_MARGIN_CM` / `PRESET_MARGINS` object independently. If you ever change a preset value, you must update two places.

---

## Performance Considerations

### PERF-1 — Auth middleware hits DB on every request
`server/middleware/auth.js` calls `User.findById(decoded.id)` on every authenticated request. At scale, this adds 1 DB query per API call. The user data in the JWT (id, name) is sufficient for most operations. Consider only doing DB lookup when fresh user data is needed (e.g., permission changes), and trust the JWT for basic identity.

### PERF-2 — Puppeteer process launched per PDF export
Each PDF export call spawns a new Chromium browser instance (`puppeteer.launch(...)`). This is slow (~1–3s startup) and memory-intensive. For concurrent exports this won't scale.

**Fix:** Keep a Puppeteer browser instance alive and reuse pages, or use a PDF generation queue.

### PERF-3 — `Document.find()` returns full `content` on dashboard
**File:** `server/routes/docs.js` (line 23)
```js
.select('title content folder deleted deletedAt lastModified createdAt owner collaborators shareToken sharePermission')
```
`content` is selected on the dashboard list endpoint. For documents with large HTML content, this adds significant bandwidth on every dashboard load.

The `DocThumb` renders a preview — but a full truncated text preview could be stored at ≤ 200 chars on save rather than sending entire HTML.

---

## Feature Completeness Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| User register / login / logout | ✅ Working | JWT 7d, bcrypt 12 |
| Create / open / delete document | ✅ Working | Soft delete + trash |
| Rename document (title) | ✅ Working | Inline edit in ribbon |
| Rich text editing | ✅ Working | via `execCommand` (deprecated) |
| Bold / Italic / Underline / Strike | ✅ Working | Keyboard shortcuts too |
| Font family / size / color | ✅ Working | |
| Alignment (L/C/R/Justify) | ✅ Working | |
| Heading styles (H1–H3) | ✅ Working | |
| Bullet / numbered lists | ✅ Working | |
| Indent / Outdent | ✅ Working | |
| Undo / Redo | ✅ Working | Custom 50-step history |
| Find & Replace | ✅ Working | |
| Insert table | ✅ Working | |
| Insert image (URL + upload) | ✅ Working | 10MB limit |
| Insert link | ⚠️ Partial | `javascript:` URLs not blocked (BUG-7) |
| Insert HR / page break | ✅ Working | |
| Insert footnote | ✅ Working | |
| Insert TOC | ✅ Working | |
| Insert symbol | ✅ Working | SymbolPicker with 6 categories |
| Spell check | ✅ Working | Levenshtein-based client-side |
| Format painter | ✅ Working | |
| Track changes | ⚠️ Partial | Not persisted through collab updates (BUG-6) |
| Word count | ✅ Working | |
| Page size / margins | ✅ Working | A4, Letter, Legal |
| Custom margins | ✅ Working | |
| Header / Footer | ✅ Working | |
| Zoom | ✅ Working | |
| Dark mode / Focus mode | ✅ Working | |
| Auto-save | ✅ Working | 2s debounce |
| Version history | ✅ Working | 30-version cap per doc |
| Comments + replies | ✅ Working | |
| Mentions in comments | ✅ Working | @-mention with popup |
| Share via link | 🔴 Broken | SERVER returns 500 — missing CLIENT_ORIGIN (CRIT-2) |
| Invite collaborators | ✅ Working | By email |
| Real-time collaboration | ✅ Working | Socket.IO with user cursors |
| Export DOCX | ✅ Working | via html-to-docx |
| Export PDF | ✅ Working | via Puppeteer (slow cold start) |
| Import DOCX | ✅ Working | via mammoth |
| Folder organization | ✅ Working | |
| Trash & restore | ✅ Working | 30-day auto-purge |
| Document templates | ✅ Working | 5 templates in Dashboard |
| Shared view (read-only) | ✅ Working | |
| Shared view (edit) | ⚠️ Partial | Editable but changes NOT saved (BUG-2) |
| Responsive / mobile | ⚠️ Partial | Ribbon is wide — not mobile-friendly |

---

## Recommendations Summary

### Immediate (before using in production)

1. **Generate real JWT secret** and add to `server/.env` (CRIT-1)
2. **Add `CLIENT_ORIGIN` and `SERVER_ORIGIN`** to `server/.env` to fix share links (CRIT-2, CRIT-3)
3. **Escape regex in doc search** to prevent ReDoS (CRIT-4)
4. **Sanitize HTML before Puppeteer** in PDF export using `sanitize-html` (CRIT-5)
5. **Block `javascript:` URLs** in `insertLink` (BUG-7)

### Short-term improvements

6. Fix `CommentsPanel` duplicate effect logic (BUG-3)
7. Wrap `onRemoteUpdate`/`onUsersChange` in `useCallback` and fix the ESLint suppression in `useCollaboration` (BUG-4)
8. Either implement save for shared-edit mode or remove `contentEditable` on SharedView (BUG-2)
9. Remove dead root-level `MSWord.jsx` and `index.html` files (STYLE-2)
10. Add `.env` to `.gitignore` properly (currently `.gitignore` content should be verified)

### Long-term

11. Migrate `document.execCommand` to ProseMirror or Tiptap (BUG-5)
12. Keep a persistent Puppeteer browser instance for PDF export (PERF-2)
13. Stop selecting full `content` on dashboard document list (PERF-3)
14. Add server-side image auth or migrate uploaded files to cloud storage with signed URLs (SEC-1)
15. Replace `localStorage` JWT with `HttpOnly` cookie + CSRF token for better XSS resilience (SEC-2)

---

## Environment Config Checklist

Current `server/.env` is missing variables. Here is the complete required config:

```env
# server/.env
PORT=5000
MONGO_URI=mongodb://localhost:27017/msword-clone
JWT_SECRET=<generate with: openssl rand -base64 64>
CLIENT_ORIGIN=http://localhost:5173          # ← MISSING — breaks share links
SERVER_ORIGIN=http://localhost:5000          # ← MISSING — wrong image URLs in prod
NODE_ENV=development
```

---

*Report generated by automated code review. All file paths are relative to project root.*
