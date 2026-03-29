# MSWord Clone — Project Status

> Last updated: 2026-03-29 — dependencies installed ✅

---

## ✅ Completed — Phase 1 (Standalone)
- `index.html` + `MSWord.jsx` — standalone Word clone, open in browser, no server needed

---

## ✅ Completed — Phase 2 (Full-Stack)

### Backend (`/server`)
- Express + MongoDB/Mongoose + JWT auth
- Socket.IO real-time collaboration (rooms per docId, presence, content sync)
- Rate limiting on auth routes (express-rate-limit)
- `models/Document.js` — title, content, owner, collaborators (with permission), shareToken, sharePermission, pageSize, margins
- `models/Version.js` — document snapshots (max 30 per doc, auto-trim)
- `models/Comment.js` — inline comments anchored via data-comment-id
- `routes/auth.js` — register, login, /me (JWT includes name for Socket.IO)
- `routes/docs.js` — CRUD + search + populate collaborators
- `routes/versions.js` — list, get, create, restore, delete versions
- `routes/comments.js` — CRUD for inline comments
- `routes/share.js` — generate/revoke share links, add/remove collaborators by email
- `routes/upload.js` — multer image upload (local /uploads/ dir)
- `routes/export.js` — export .docx (html-to-docx), import .docx (mammoth)

### Frontend (`/client`)
- React 18 + Vite + Tailwind CSS + React Router v6
- `socket.io-client` for real-time
- `dompurify` for content sanitization

#### Pages
- `Login.jsx` / `Register.jsx` — Office-themed auth cards
- `Dashboard.jsx` — doc grid + search/filter + import .docx + shared/collab badges
- `Editor.jsx` — complete 5-tab ribbon editor (see below)
- `SharedView.jsx` — public view-only or edit via share token

#### Editor — 5-tab Ribbon
- **Home**: Undo/Redo, Font family (12), Font size (8–72pt), B/I/U/S, Text color (20 colors + custom), Highlight color, Heading styles (Normal/H1/H2/H3/H4), Align L/C/R/J, Bullet/Numbered lists, Indent/Outdent, Clear formatting, Find & Replace shortcut
- **Insert**: Table (grid picker + manual), Image (URL or file upload), Link/Unlink, HR, Page Break, Footnote, Table of Contents (auto from headings), Import .docx/.txt, Export .docx/.html/.txt, Print
- **Layout**: Page size (A4/Letter/Legal), Margins (Normal/Narrow/Wide), Line spacing (1.0–3.0), Page numbers toggle
- **Review**: Track Changes toggle (beforeinput intercept), Accept All / Reject All, Comments panel toggle, Word Count modal, Version History toggle, Find & Replace
- **View**: Zoom (25–200%), Ruler toggle, Dark/light mode, Focus mode (distraction-free)

#### Editor Features
- Auto-save (2s debounce) → `PUT /api/docs/:id`
- Auto-version snapshot when content changes significantly (>250 chars diff)
- Undo/Redo (50-step history, innerHTML snapshots)
- Real-time collaboration via Socket.IO — colored user avatars in app bar
- Track Changes — wraps insertions in `<ins class="tc-ins">`, Accept/Reject All
- Keyboard shortcuts: Ctrl+B/I/U/Z/Y/S/F
- Beforeunload guard for unsaved changes
- Cursor save/restore around all dialogs

#### Editor Modals
- `FindReplaceModal` — highlight all matches, navigate, replace one/all
- `TableDialog` — 10×10 hover grid picker + manual rows/cols input
- `ImageDialog` — URL tab + file upload tab (POST /api/upload/image)
- `LinkDialog` — URL + display text + new-tab option
- `ShareModal` — generate/revoke share link, manage collaborators by email + permission
- `WordCountModal` — words, chars, paragraphs, lines, pages estimate, reading time

#### Editor Panels (sidebars)
- `VersionHistoryPanel` — list 30 versions, preview content, restore, save now, delete
- `CommentsPanel` — add comment on selected text, view/resolve/delete, filter open/resolved

#### Other components
- `Ruler.jsx` — horizontal ruler with tick marks and margin shading
- `hooks/useEditor.js` — all formatting logic, undo/redo, insert helpers
- `hooks/useCollaboration.js` — Socket.IO room management
- `api/versions.js`, `api/comments.js`, `api/share.js`, `api/upload.js`, `api/exportImport.js`

---

## ❌ Not Yet Done

### Setup (Blocking — only these two steps remain)
- [ ] Start MongoDB (`mongod`) or set Atlas URI in `server/.env`
- [ ] Change `JWT_SECRET` in `server/.env` to a long random string

### Already Done
- [x] `npm install` — server dependencies installed (socket.io, html-to-docx, mammoth, multer, etc.)
- [x] `npm install` — client dependencies installed (socket.io-client, dompurify, etc.)

### Features
- [ ] Real collaborator cursor positions (pixel-level cursor overlay is complex in contenteditable)
- [ ] True DOCX export fidelity (html-to-docx handles basic formatting; complex layouts may vary)
- [ ] PDF export (currently uses window.print(); puppeteer backend route not implemented)
- [ ] Page numbers (currently decorative top/bottom; no real pagination in contenteditable)
- [ ] Spell check dictionary (uses browser native spellcheck)
- [ ] Version diff view (shows preview, no visual diff highlighting between versions)
- [ ] Real-time comment sync (comments shown on reload; no live Socket.IO comment events)

### Production Hardening
- [ ] DOMPurify on server-side content save (prevent stored XSS)
- [ ] HTTPS / reverse proxy
- [ ] CSRF protection (token in localStorage, not httpOnly cookie)
- [ ] Docker / docker-compose
- [ ] CI/CD pipeline

---

## 🔧 How to Run

### Standalone (no server)
```
Open: c:\Users\Admin\Desktop\MSWord\index.html in Chrome/Edge
```

### Full-Stack
```bash
# ✅ Dependencies already installed — skip this step
# npm install / cd server && npm install / cd ../client && npm install

# 1. Set up MongoDB (pick one):
#    a) Local:  mongod --dbpath C:\data\db
#    b) Atlas:  set MONGO_URI=mongodb+srv://... in server\.env

# 2. Set a secure JWT secret in server\.env:
#    JWT_SECRET=your-long-random-secret-here

# 3. Start the app:
cd c:\Users\Admin\Desktop\MSWord
npm run dev

# Frontend → http://localhost:5173
# Backend  → http://localhost:5000
```

---

## 📁 Key New Files (Phase 2 rebuild)

```
server/
├── index.js                 ✅ Socket.IO + rate limiting + new routes
├── models/
│   ├── Document.js          ✅ updated: shareToken, collaborator permissions
│   ├── Version.js           ✅ NEW
│   └── Comment.js           ✅ NEW
├── routes/
│   ├── auth.js              ✅ updated: name in JWT
│   ├── docs.js              ✅ updated: search, new collaborator schema
│   ├── versions.js          ✅ NEW
│   ├── comments.js          ✅ NEW
│   ├── share.js             ✅ NEW
│   ├── upload.js            ✅ NEW
│   └── export.js            ✅ NEW

client/src/
├── App.jsx                  ✅ +SharedView route
├── index.css                ✅ +TC/comments/dark/footnote/TOC/ruler styles
├── pages/
│   ├── Dashboard.jsx        ✅ +search, +import .docx
│   ├── Editor.jsx           ✅ complete rebuild
│   └── SharedView.jsx       ✅ NEW
├── components/
│   ├── editor/
│   │   ├── Ribbon.jsx       ✅ NEW — all 5 tabs
│   │   └── Ruler.jsx        ✅ NEW
│   ├── modals/
│   │   ├── FindReplaceModal.jsx  ✅ NEW
│   │   ├── TableDialog.jsx       ✅ NEW
│   │   ├── ImageDialog.jsx       ✅ NEW
│   │   ├── LinkDialog.jsx        ✅ NEW
│   │   ├── ShareModal.jsx        ✅ NEW
│   │   └── WordCountModal.jsx    ✅ NEW
│   └── panels/
│       ├── VersionHistoryPanel.jsx ✅ NEW
│       └── CommentsPanel.jsx       ✅ NEW
├── hooks/
│   ├── useEditor.js          ✅ NEW
│   └── useCollaboration.js   ✅ NEW
└── api/
    ├── versions.js           ✅ NEW
    ├── comments.js           ✅ NEW
    ├── share.js              ✅ NEW
    ├── upload.js             ✅ NEW
    └── exportImport.js       ✅ NEW
```
