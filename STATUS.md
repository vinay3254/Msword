# MSWord Clone — Project Status

> Last updated: 2026-03-29

---

## ✅ Completed Tasks

### Phase 1 — Standalone Browser Version
- [x] `index.html` — CDN loader (React 18, Babel Standalone, Tailwind Play CDN)
- [x] `MSWord.jsx` — Fully self-contained Word clone (no build step, open in browser)
  - [x] Classic Office ribbon UI (Home tab with all groups)
  - [x] Font family dropdown (10 fonts)
  - [x] Font size selector (8–72pt, exact pt sizing via post-processing)
  - [x] Bold, Italic, Underline, Strikethrough buttons
  - [x] Text color picker + highlight color picker
  - [x] Align Left / Center / Right / Justify
  - [x] Bullet list & numbered list
  - [x] Indent / Outdent
  - [x] Undo / Redo (manual innerHTML snapshots, 50-step history)
  - [x] Heading styles dropdown (Normal, H1, H2, H3)
  - [x] Insert Table (rows × cols dialog with preview grid)
  - [x] Clear formatting button
  - [x] White A4 page canvas (794px) on gray background with drop shadow
  - [x] `contentEditable` div with `document.execCommand` formatting
  - [x] Word count + character count in status bar
  - [x] Save as `.txt` (Blob download)
  - [x] Save as `.html` (Blob download with embedded CSS)
  - [x] New Document (with confirmation dialog)
  - [x] Open `.txt` file (FileReader)
  - [x] Keyboard shortcuts: Ctrl+B/I/U, Ctrl+Z/Y, Ctrl+S
  - [x] `beforeunload` guard for unsaved changes
  - [x] Cursor position save/restore around dialogs
  - [x] Title bar (decorative window controls)
  - [x] Ribbon tab row (Home / Insert / View)

---

### Phase 2 — Full-Stack Version

#### Root / DevOps
- [x] Root `package.json` with `concurrently` (`npm run dev` starts both)
- [x] `.env.example` template
- [x] `README.md` with full setup instructions and API reference
- [x] `server/.env` — environment file (fixed: was in wrong directory)

#### Backend (`/server`)
- [x] `server/package.json` — Express, Mongoose, bcryptjs, JWT, Helmet, CORS, Morgan, nodemon
- [x] `server/index.js` — Express app with Helmet, CORS, Morgan, JSON body parser, error handler
- [x] `server/models/User.js` — name, email, bcrypt password (select:false), `comparePassword` method
- [x] `server/models/Document.js` — title, content (HTML), owner, collaborators[], lastModified (auto-updated)
- [x] `server/middleware/auth.js` — JWT Bearer verification, attaches `req.user`
- [x] `server/routes/auth.js` — `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- [x] `server/routes/docs.js` — Full CRUD (`GET/POST /api/docs`, `GET/PUT/DELETE /api/docs/:id`)
  - [x] Ownership checks (only owner can delete)
  - [x] Collaborator read/write access
  - [x] express-validator input validation on all routes
  - [x] Proper CastError handling for invalid MongoDB IDs
- [x] Health check endpoint: `GET /api/health`

#### Frontend (`/client`)
- [x] `client/package.json` — Vite, React 18, React Router v6, Tailwind CSS, Axios
- [x] `client/vite.config.js` — Vite + `/api` proxy → `localhost:5000`
- [x] `client/tailwind.config.js` — Office color palette extended
- [x] `client/postcss.config.js`
- [x] `client/index.html` — SVG favicon, root div
- [x] `client/src/main.jsx` — ReactDOM.createRoot entry
- [x] `client/src/index.css` — Tailwind + rich-text editor styles + print styles + scrollbar styles
- [x] `client/src/App.jsx` — BrowserRouter + AuthProvider + protected/public routes
- [x] `client/src/context/AuthContext.jsx` — `user`, `token`, `login()`, `logout()`, localStorage rehydration
- [x] `client/src/api/axios.js` — Axios instance, Bearer token interceptor, 401 → redirect to `/login`
- [x] `client/src/components/ProtectedRoute.jsx` — Redirects to `/login` if not authenticated
- [x] `client/src/pages/Login.jsx` — Office-blue card UI, form validation, loading spinner
- [x] `client/src/pages/Register.jsx` — Name + email + password + confirm, client-side validation
- [x] `client/src/pages/Dashboard.jsx`
  - [x] Greeting (`Good morning/afternoon/evening, Name`)
  - [x] Document grid (auto-fill responsive columns)
  - [x] Document thumbnail cards
  - [x] Create new document → navigate to editor
  - [x] Inline rename (click title → input → Enter/blur to save)
  - [x] Delete with confirmation
  - [x] Relative timestamps (`Just now`, `5m ago`, `Mar 15`)
  - [x] Empty state illustration
  - [x] Error banner with dismiss
- [x] `client/src/pages/Editor.jsx`
  - [x] Load document from API on mount
  - [x] **Auto-save** — 3-second debounce → `PUT /api/docs/:id`, Save badge (Unsaved / Saving… / Saved / Error)
  - [x] Immediate save on Back button click
  - [x] Inline editable document title in app bar
  - [x] **Home tab** — Undo/Redo, Font family/size, B/I/U/S, Text/Highlight color, Alignments, Bullet/Numbered lists, Indent/Outdent, Heading styles, Clear formatting
  - [x] **Insert tab** — Insert Table (dialog + preview), Insert Image (URL + live preview), Horizontal Rule
  - [x] **Layout tab** — Page size toggle (A4 / Letter), Margin selector (Normal / Narrow / Wide), live page resize
  - [x] Export `.txt` and `.html` (Blob download)
  - [x] Print button (`window.print()`) with print CSS (hides ribbon/toolbar)
  - [x] Word count + character count + page size in status bar
  - [x] Keyboard shortcuts: Ctrl+B/I/U/Z/Y/S
  - [x] Cursor save/restore for all dialogs and color pickers
  - [x] Undo/Redo (50-step history)
  - [x] User avatar + name initial in app bar
  - [x] Back to Dashboard button

---

## ❌ Remaining / Not Yet Done

### Setup (Blocking — must do before running full-stack)
- [ ] **Start MongoDB** locally (`mongod`) or set Atlas URI in `server/.env`
  ```
  MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/msword-clone
  ```
- [ ] **Change `JWT_SECRET`** in `server/.env` to a long random string (current value is the placeholder)

### Features Not Implemented
- [ ] **Refresh tokens** — current JWT is single 7-day access token; no silent refresh
- [ ] **Real-time collaboration** — no WebSocket/Socket.io; multiple users editing same doc will overwrite each other
- [ ] **Image upload** — Insert Image only supports URLs; no local file upload to server (no Multer)
- [ ] **Open `.html` file** in editor (standalone version only supports `.txt`)
- [ ] **Document search** — no search/filter on Dashboard
- [ ] **Document sorting** — no sort options (currently sorts by lastModified desc)
- [ ] **Collaborator management UI** — backend supports `collaborators[]` field but no frontend to add/remove them
- [ ] **Page numbers** — status bar shows "Page 1 of 1" hardcoded; no real pagination
- [ ] **Spell check dictionary** — uses browser native spellcheck only
- [ ] **Comment / annotation** system
- [ ] **Version history** — no document revision tracking
- [ ] **Zoom control** — no zoom in/out for the canvas
- [ ] **Find & Replace** — Ctrl+F uses browser native; no custom find/replace dialog
- [ ] **Table resize handles** — tables are inserted at fixed column width
- [ ] **Dark mode** for the editor

### Production Hardening
- [ ] **HTTPS** — no SSL config; needs reverse proxy (Nginx) or hosting platform
- [ ] **Rate limiting** — no `express-rate-limit` on auth routes (brute-force risk)
- [ ] **CSRF protection** — token is in localStorage (XSS risk); not using httpOnly cookies
- [ ] **Content sanitization** — `innerHTML` is stored as-is; no DOMPurify on save/load
- [ ] **File size limit** on document content — currently 10 MB body limit but no per-doc size cap
- [ ] **MongoDB indexes** — `owner` + `lastModified` indexed; no compound index for collaborator queries
- [ ] **Environment validation** — server crashes if `MONGO_URI` is missing (currently unhandled)
- [ ] **Docker / docker-compose** — no containerization setup
- [ ] **CI/CD pipeline** — no GitHub Actions or deployment config

---

## 🔧 How to Run Right Now

### Standalone (no server needed)
```
Open: c:\Users\Admin\Desktop\MSWord\index.html
in Chrome or Edge — works immediately
```

### Full-Stack
```bash
# 1. Fix MongoDB (pick one):
#    a) Start local MongoDB:  mongod --dbpath C:\data\db
#    b) Use Atlas: set MONGO_URI in server\.env

# 2. (Optional) Change JWT_SECRET in server\.env

# 3. Run:
cd "c:\Users\Admin\Desktop\MSWord"
npm run dev

# Frontend → http://localhost:5173
# Backend  → http://localhost:5000
```

---

## 📁 File Tree (all created files)

```
MSWord/
├── index.html                          ✅ standalone loader
├── MSWord.jsx                          ✅ standalone component
├── package.json                        ✅ concurrently root
├── .env                                ✅ (root — not used by server)
├── .env.example                        ✅ template
├── README.md                           ✅ setup guide
├── STATUS.md                           ✅ this file
│
├── server/
│   ├── .env                            ✅ fixed — server reads from here
│   ├── package.json                    ✅
│   ├── index.js                        ✅ Express entry
│   ├── middleware/
│   │   └── auth.js                     ✅ JWT guard
│   ├── models/
│   │   ├── User.js                     ✅
│   │   └── Document.js                 ✅
│   └── routes/
│       ├── auth.js                     ✅ register + login + /me
│       └── docs.js                     ✅ CRUD + ownership
│
└── client/
    ├── index.html                      ✅
    ├── package.json                    ✅
    ├── vite.config.js                  ✅ /api proxy
    ├── tailwind.config.js              ✅
    ├── postcss.config.js               ✅
    └── src/
        ├── main.jsx                    ✅
        ├── index.css                   ✅ Tailwind + editor styles
        ├── App.jsx                     ✅ routes
        ├── api/
        │   └── axios.js                ✅ interceptor
        ├── context/
        │   └── AuthContext.jsx         ✅
        ├── components/
        │   └── ProtectedRoute.jsx      ✅
        └── pages/
            ├── Login.jsx               ✅
            ├── Register.jsx            ✅
            ├── Dashboard.jsx           ✅
            └── Editor.jsx              ✅ full ribbon editor
```
