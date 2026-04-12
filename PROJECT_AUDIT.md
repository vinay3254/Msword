# MSWord Clone — Full Project Audit
> Generated: 2026-04-12 | Audited against: Real Microsoft Word
> Codebase: `C:\Users\Admin\Desktop\MSWord`

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Full Folder Structure](#2-full-folder-structure)
3. [Tech Stack](#3-tech-stack)
4. [File-by-File Summary](#4-file-by-file-summary)
5. [What Works](#5-what-works)
6. [What Doesn't Work — Bugs & Broken Features](#6-what-doesnt-work--bugs--broken-features)
7. [What Needs to Be Added](#7-what-needs-to-be-added)
8. [Priority Roadmap](#8-priority-roadmap)

---

## 1. Project Overview

A full-stack **Microsoft Word / Google Docs clone** with two modes:

| Mode | Files | Requires |
|---|---|---|
| Standalone (browser-only) | `index.html` + `MSWord.jsx` | Nothing — open in Chrome |
| Full-stack | `client/` + `server/` | Node.js, MongoDB |

**Core features shipped:**
Auth (JWT) · Document CRUD · Auto-save · Real-time collaboration (Socket.IO) · Version history · Comments · Share links · Track changes · Find & Replace · Export HTML/TXT/DOCX · Import DOCX/TXT · Dark mode · Focus mode · Zoom · Ruler · Page size/margins

---

## 2. Full Folder Structure

```
MSWord/
├── MSWord.jsx                        ← Standalone browser-only editor
├── index.html                        ← Entry for standalone version
├── package.json                      ← Root: concurrently runs server + client
├── .env                              ← Root env (unused by either app)
├── .gitignore
├── README.md
├── STATUS.md
│
├── server/                           ← Node.js + Express backend (port 5000)
│   ├── index.js                      ← App entry: Express, Socket.IO, MongoDB
│   ├── .env                          ← MONGO_URI, JWT_SECRET, PORT, CLIENT_ORIGIN
│   ├── middleware/
│   │   └── auth.js                   ← JWT Bearer middleware, attaches req.user
│   ├── models/
│   │   ├── User.js                   ← bcrypt pre-save hook, comparePassword()
│   │   ├── Document.js               ← owner, collaborators[], shareToken, pageSize, margins
│   │   ├── Version.js                ← Snapshots with createAndTrim() static
│   │   └── Comment.js                ← Per-document comments with anchorId
│   ├── routes/
│   │   ├── auth.js                   ← POST /register /login, GET /me
│   │   ├── docs.js                   ← Full CRUD, owner+collaborator access
│   │   ├── versions.js               ← List, get, create, restore, delete snapshots
│   │   ├── share.js                  ← Share links (UUID), collaborator CRUD by email
│   │   ├── comments.js               ← Comments CRUD
│   │   ├── upload.js                 ← multer file upload to /uploads
│   │   └── export.js                 ← DOCX export (html-to-docx), DOCX import (mammoth)
│   └── uploads/                      ← Uploaded files stored here
│
└── client/                           ← React 18 + Vite + Tailwind (port 5173)
    ├── index.html
    ├── vite.config.js                ← Proxies /api → localhost:5000
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── main.jsx                  ← ReactDOM.render entry
        ├── App.jsx                   ← Routes: /, /docs/:id, /shared/:token
        ├── index.css                 ← Global styles, print styles, editor CSS
        ├── context/
        │   └── AuthContext.jsx       ← JWT stored in localStorage, user state
        ├── api/
        │   ├── axios.js              ← Axios instance, Bearer token interceptor
        │   ├── comments.js           ← getComments, addComment, updateComment, deleteComment
        │   ├── exportImport.js       ← exportDocx, importDocx
        │   ├── share.js              ← generateShareLink, revokeShareLink, addCollaborator, removeCollaborator
        │   ├── upload.js             ← uploadFile
        │   └── versions.js          ← getVersions, getVersion, createVersion, restoreVersion, deleteVersion
        ├── hooks/
        │   ├── useEditor.js          ← contentEditable engine: exec, undo/redo, paste, insert*, word count
        │   └── useCollaboration.js   ← Socket.IO: join/leave room, emit/receive content, user presence
        ├── components/
        │   ├── ProtectedRoute.jsx    ← Redirects to /login if no token
        │   ├── editor/
        │   │   ├── Ribbon.jsx        ← Home / Insert / Layout / Review / View tabs
        │   │   └── Ruler.jsx         ← Visual ruler with margin indicators
        │   ├── modals/
        │   │   ├── FindReplaceModal.jsx   ← TreeWalker text search, highlight, prev/next, replace
        │   │   ├── ImageDialog.jsx        ← URL + alt text input
        │   │   ├── LinkDialog.jsx         ← URL + link text + new tab option
        │   │   ├── ShareModal.jsx         ← Share link + collaborator management
        │   │   ├── TableDialog.jsx        ← Row × Col picker
        │   │   └── WordCountModal.jsx     ← Words, chars, chars-no-spaces, paragraphs, lines
        │   └── panels/
        │       ├── CommentsPanel.jsx      ← Add/resolve/delete comments, filter open/resolved
        │       └── VersionHistoryPanel.jsx← List versions, preview, restore, delete
        └── pages/
            ├── Login.jsx             ← Email + password form
            ├── Register.jsx          ← Name + email + password form
            ├── Dashboard.jsx         ← Grid of docs, search, rename, delete, import
            ├── Editor.jsx            ← Main editor: app bar, ribbon, ruler, canvas, panels, modals
            └── SharedView.jsx        ← Public read/edit view via share token
```

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| State | React Context (auth), local useState/useRef (editor) |
| Editor engine | `document.execCommand` (deprecated but functional) |
| Real-time | Socket.IO client v4 |
| HTTP client | Axios with Bearer interceptor |
| XSS protection | DOMPurify (installed, **partially unused**) |
| Backend | Node.js, Express |
| Security | Helmet (CSP disabled!), CORS, express-rate-limit, express-validator |
| Auth | JWT (7-day), bcryptjs (cost 12) |
| Real-time server | Socket.IO v4 |
| Database | MongoDB + Mongoose |
| File upload | multer (memory storage, 20MB limit) |
| DOCX export | html-to-docx (optional install) |
| DOCX import | mammoth (optional install) |
| Dev tooling | concurrently, nodemon, morgan |

---

## 4. File-by-File Summary

### `server/index.js`
- Creates Express app + HTTP server + Socket.IO server
- Middleware stack: Helmet (no CSP), CORS, Morgan, rate limiter, body parser
- Static file serving for `/uploads`
- Socket.IO auth: validates JWT on every connection, attaches `userId` + `userName` to socket
- Socket.IO rooms: `doc:{docId}` — tracks online users with color assignment
- Socket events: `join-doc`, `doc-update`, `cursor-update`, `leave-doc`, `disconnect`
- **Bug:** `cursor-updated` event is emitted by server but never listened to on client

### `server/middleware/auth.js`
- Reads `Authorization: Bearer <token>` header
- Verifies JWT, fetches user from DB (excluding password)
- Distinguishes `TokenExpiredError` vs other invalid token errors
- Attaches `req.user` for downstream routes

### `server/models/User.js`
- Fields: `name`, `email` (unique, lowercase), `password` (select: false)
- Pre-save hook: bcrypt hash with cost 12
- Instance method: `comparePassword(candidate)`

### `server/models/Document.js`
- Fields: `title`, `content` (raw HTML string), `owner` (ref User), `collaborators[]` `{user, permission}`, `lastModified`, `shareToken`, `sharePermission`, `pageSize`, `margins`
- Pre-save hook: updates `lastModified`
- Collaborators use `_id: false` sub-schema

### `server/models/Version.js`
- Fields: `document` (ref), `content`, `title`, `savedBy` (ref User), `label`, `createdAt`
- Static `createAndTrim()`: creates snapshot, trims to max 50 per document

### `server/models/Comment.js`
- Fields: `document` (ref), `author` (ref User), `anchorId` (matches `data-comment-id` span in DOM), `text`, `resolved`

### `server/routes/auth.js`
- `POST /api/auth/register`: validates name/email/password, checks duplicate email, creates user, returns JWT
- `POST /api/auth/login`: validates, fetches with `+password`, compares, returns JWT
- `GET /api/auth/me`: returns current user (auth-protected)
- JWT payload includes `{ id, name }` so Socket.IO doesn't need DB lookup

### `server/routes/docs.js`
- All routes require auth middleware
- Access check: owner OR `collaborators.user` matches
- `GET /api/docs`: search by title regex, populate collaborators, sort by lastModified
- `POST /api/docs`: create with title + content
- `GET /api/docs/:id`: single doc with owner + collaborators populated
- `PUT /api/docs/:id`: update title, content, pageSize, margins
- `DELETE /api/docs/:id`: owner-only, also deletes all versions

### `server/routes/versions.js`
- `GET /api/versions/:docId`: list up to 30, excludes content for performance
- `GET /api/versions/:docId/:versionId`: single version with content
- `POST /api/versions/:docId`: create snapshot from current doc content
- `POST /api/versions/:docId/:versionId/restore`: saves current state first, then restores
- `DELETE /api/versions/:docId/:versionId`: owner-only

### `server/routes/share.js`
- `POST /api/share/:docId`: generates UUID token, owner-only
- **Bug:** link URL uses `req.get('host').replace('5000', '5173')` — hardcoded dev-only hack
- `DELETE /api/share/:docId`: revokes token (sets null)
- `GET /api/share/doc/:token`: public endpoint, returns doc by token (no auth)
- `POST /api/share/:docId/collaborators`: add by email, update permission if existing
- `DELETE /api/share/:docId/collaborators/:userId`: remove collaborator

### `server/routes/export.js`
- `GET /api/export/:docId/docx`: lazy-requires `html-to-docx`, converts doc HTML to DOCX buffer
- `POST /api/export/:docId/import-docx`: receives file via multer, lazy-requires `mammoth`, converts to HTML, saves to doc
- Both packages are optional and lazy-required at runtime (not declared in package.json)

### `client/src/hooks/useEditor.js`
- Custom undo/redo: array of HTML snapshots, max 50 states
- `exec(cmd, value)`: wraps `document.execCommand`, pushes history
- `saveRange/restoreRange`: saves/restores `Selection.getRangeAt(0)` by clone
- `insertHTML`: calls `execCommand('insertHTML')` after restoring range
- `applyHeading`: `execCommand('formatBlock', tag)`
- `insertTable`: builds HTML table with `width:%` columns
- `insertImage`: `<img src>` via insertHTML
- `insertLink`: `createLink` if selection, else `insertHTML`
- `insertHR`, `insertPageBreak`, `insertFootnote`, `insertTOC`
- `getWordCount`: counts words/chars/paragraphs from `innerText`
- `handleKeyDown`: Ctrl+B/I/U/Z/Y
- `handlePaste`: strips `<script>/<style>` via regex (**not DOMPurify**)

### `client/src/hooks/useCollaboration.js`
- Connects Socket.IO to `/` (proxied by Vite to `localhost:5000`)
- On connect: emits `join-doc`
- Listens: `room-users`, `user-joined`, `user-left`, `doc-updated`
- **Bug:** never listens for `cursor-updated` — collaborator cursors are invisible
- `emitContent`: debounced 500ms, emits `doc-update` with full HTML

### `client/src/pages/Editor.jsx`
- State: doc, title, saveStatus, pageSize, margins, lineSpacing, fontFamily, fontSize, textColor, highlightColor, trackChanges, onlineUsers, all modal/panel visibility flags
- `save()`: PUT /api/docs/:id with content + title + pageSize + margins; triggers version snapshot if content delta > 250 chars
- `scheduleSave()`: 2-second debounce before save
- Track Changes: `beforeinput` event intercepts `insertText` only, wraps in `<ins class="tc-ins">`
- `acceptAllChanges`: removes `<del>`, unwraps `<ins>`
- `rejectAllChanges`: removes `<ins>`, unwraps `<del>`
- Font size: maps pt → execCommand level 1-7 then setTimeout patch to inline style
- Link insertion: uses `createLink` if selection, else insertHTML
- Export HTML/TXT: Blob + anchor click (client-side)
- Keyboard: Ctrl+F (find), Ctrl+S (save), beforeunload guard on unsaved

### `client/src/components/editor/Ribbon.jsx`
- 5 tabs: Home, Insert, Layout, Review, View
- **Home**: Undo/Redo, Font family dropdown, Font size dropdown, Bold/Italic/Underline/Strike, Color pickers (text + highlight), Clear formatting, Heading style dropdown (`defaultValue` not `value` — **bug**), Align L/C/R/J, Bullet/Numbered lists, Indent/Outdent, Find&Replace
- **Insert**: Table, Image, Link, Unlink, HR, Page Break, Footnote, TOC, Import .docx/.txt, Export .docx/.html/.txt, Print
- **Layout**: Page size (A4/Letter/Legal), Margins (Normal/Narrow/Wide), Line spacing select, Page numbers toggle
- **Review**: Track Changes toggle, Accept All, Reject All, Comments panel toggle, Word Count, Version History toggle, Find & Replace
- **View**: Zoom −/select/+, Ruler toggle, Dark mode toggle, Focus mode toggle

### `client/src/components/modals/FindReplaceModal.jsx`
- TreeWalker iterates text nodes, regex-wraps matches in `<span class="search-highlight">`
- Current match gets class `active`
- Find Next/Prev: cycles through matches array
- Replace Current: replaces single span with text node
- Replace All: replaces all spans
- Cleans up highlights on unmount

### `client/src/components/modals/ShareModal.jsx`
- Generates/revokes share link via API
- Copies link to clipboard
- Add collaborator by email + permission
- List and remove collaborators
- Share link constructed from `window.location.origin` (fixes the server-side port hack)

### `client/src/components/panels/CommentsPanel.jsx`
- Load comments on mount
- Add: `range.surroundContents(span)` wraps selected text (**fails on cross-element selections**)
- Resolve: toggles `resolved`, dims anchor span opacity
- Delete: removes from DB + unwraps anchor span
- Focus: scrolls to and briefly highlights anchor span
- Filter: All / Open / Resolved tabs
- **Bug:** undo removes anchor span while DB comment survives → dead anchor

### `client/src/components/panels/VersionHistoryPanel.jsx`
- Lists versions (label, time, savedBy)
- Preview: fetches full content, renders in split pane via `dangerouslySetInnerHTML` (**no sanitization — XSS risk**)
- Restore: calls API, calls `onRestore(content, title)` in Editor, closes panel
- Delete: owner only
- "Save now" creates manual snapshot

### `client/src/pages/Dashboard.jsx`
- Grid of document cards with fake `DocThumb` placeholder (always same bars)
- Search: debounced 300ms, queries `GET /api/docs?search=`
- Create, Delete (with confirm), Rename (inline input on card)
- Import .docx: creates empty doc first, then imports
- Greeting changes by time of day

---

## 5. What Works

### Auth & Data
- Register / Login / JWT auth (7-day tokens, bcrypt cost 12)
- Rate limiting on auth routes (20 req / 15 min)
- Document CRUD with owner + collaborator access control
- Auto-save with 2s debounce + visual indicator (Saved ✓ / Saving… / ● Unsaved / ⚠ Save error)
- Version snapshots — auto (>250 char delta) + manual
- Version restore with "before restore" safety snapshot

### Editor
- Bold, Italic, Underline, Strikethrough
- Font family (12 options) and font size (8–72pt)
- Text color and highlight color with custom color picker
- Heading styles H1–H4 + Normal
- Align Left / Center / Right / Justify
- Bullet lists, numbered lists, indent, outdent
- Undo / Redo (custom 50-state stack)
- Clear formatting
- Keyboard shortcuts: Ctrl+B/I/U/Z/Y/S/F
- BeforeUnload guard on unsaved changes

### Insert
- Table (rows × cols picker, percentage column widths)
- Image (URL + alt text)
- Link (URL + text + new tab), Unlink
- Horizontal rule
- Page break (CSS marker)
- Footnotes (numbered, auto-increment, editable text)
- Table of Contents (scans h1/h2/h3, live anchor hrefs)

### Layout & View
- Page size: A4 / Letter / Legal (dimensions applied to canvas)
- Margins: Normal / Narrow / Wide
- Line spacing: 1.0 – 3.0
- Zoom: 25–200% (CSS transform scale)
- Ruler (visual, with margin indicators)
- Dark mode (editor + canvas background)
- Focus mode (hides all chrome)
- Page numbers toggle (top + bottom — both hardcoded "1")
- Word count: words, chars, chars-no-spaces, paragraphs, lines

### Collaboration & Sharing
- Real-time Socket.IO rooms per document
- User presence avatars (up to 5, color-coded)
- Share link generation (UUID token, view/edit permission)
- Share link revocation
- Add/remove collaborators by email (view/edit permission)
- Public shared view (`/shared/:token`)

### Review
- Track changes (insertions only — `<ins class="tc-ins">`)
- Accept all / Reject all tracked changes
- Comments: anchor to selected text, resolve/reopen, delete, filter
- Find & Replace: case-sensitive option, prev/next, replace one, replace all
- Word count modal

### Export / Import
- Export HTML (client-side Blob)
- Export TXT (client-side Blob, uses `innerText`)
- Export DOCX (server, optional `html-to-docx`)
- Import DOCX (server, optional `mammoth`)
- Import TXT (client-side FileReader)
- Print (`window.print()`)

---

## 6. What Doesn't Work — Bugs & Broken Features

### Editor Engine

| # | Bug | Location | Detail |
|---|---|---|---|
| 1 | Font size is a hack | `Editor.jsx:210-217` | Maps pt→level 1-7 then setTimeout patches `<font size>` to inline style. Desyncs from history. |
| 2 | Undo/redo loses cursor | `useEditor.js:31-34` | `innerHTML` replacement destroys browser caret position |
| 3 | Paste not sanitized with DOMPurify | `useEditor.js:221-226` | Strips script/style via regex only — bypassable. DOMPurify is installed but unused here. **Stored XSS risk.** |
| 4 | `execCommand` is deprecated | All of `useEditor.js` | Removed from spec; browser support persists but future is uncertain |

### Ribbon State (Formatting Blind)

| # | Bug | Location | Detail |
|---|---|---|---|
| 5 | Heading dropdown never reflects selection | `Ribbon.jsx:106-109` | Uses `defaultValue="p"` (uncontrolled). Always shows "Normal" regardless of cursor position. |
| 6 | Bold/Italic/Underline buttons never go active | `Ribbon.jsx:96-99` | No `document.queryCommandState()` call anywhere. Buttons never highlight. |
| 7 | Font family/size dropdowns don't track cursor | `Ribbon.jsx:87-93` | No `queryCommandValue()` on selection change. Always shows Calibri 11. |

### Track Changes (Severely Incomplete)

| # | Bug | Location | Detail |
|---|---|---|---|
| 8 | Only text insertion is tracked | `Editor.jsx:149-157` | `beforeinput` only intercepts `insertText`. Backspace, Delete, Cut, Paste, toolbar formatting = untracked. |
| 9 | Track changes + undo conflict | `Editor.jsx` | Undoing while TC is on replays `<ins>` spans from history states. Behavior undefined. |

### Real-time Collaboration

| # | Bug | Location | Detail |
|---|---|---|---|
| 10 | Last-write-wins overwrites | `useCollaboration.js:41-44` | No OT or CRDT. Two simultaneous edits = one is silently lost. |
| 11 | Collaborator cursors never render | `useCollaboration.js` + `server/index.js:107-110` | Server emits `cursor-updated`. Client never listens. Other users' cursors are completely invisible. |
| 12 | Cursor lost on remote updates | `useCollaboration.js:41` + `useEditor.js:49-65` | `saveRange/restoreRange` uses DOM positions which are invalidated when innerHTML is rebuilt. Cursor jumps or disappears. |

### Comments

| # | Bug | Location | Detail |
|---|---|---|---|
| 13 | Comment anchors break on undo | `CommentsPanel.jsx:34-46` | Undo removes anchor `<span>` from DOM; DB comment still exists with dead `anchorId`. Clicking jumps to nothing. |
| 14 | `surroundContents` fails on cross-element selections | `CommentsPanel.jsx:41` | Throws `HierarchyRequestError` if selection crosses element boundaries (common case). Caught and shown as error to user. |
| 15 | No comment threading | `CommentsPanel.jsx` | Flat comment list only. No replies. |

### Page Layout

| # | Bug | Location | Detail |
|---|---|---|---|
| 16 | No real pagination | `Editor.jsx:398-426` | One continuous `contentEditable` div. Page breaks are CSS markers only. Content never reflows across actual pages. |
| 17 | Page numbers hardcoded "1" | `Editor.jsx:406 & 423` | Both top and bottom show `1`. Never updates. Multi-page docs all show page 1. |
| 18 | Ruler is display-only | `Ruler.jsx` | Visual only. No draggable margin handles, no tab stop placement. |
| 19 | Line spacing is document-wide | `Editor.jsx:414` | `lineHeight` CSS on the whole editor div. Should be per-paragraph. |

### Version History

| # | Bug | Location | Detail |
|---|---|---|---|
| 20 | Version preview is unsanitized | `VersionHistoryPanel.jsx:149` | `dangerouslySetInnerHTML={{ __html: preview.content }}` with no DOMPurify. **XSS risk** — malicious saved content executes on preview. |

### Security

| # | Issue | Location | Detail |
|---|---|---|---|
| 21 | Share link URL is dev-only hack | `server/routes/share.js:17` | `host.replace('5000', '5173')` breaks in production and on any hostname containing "5000". |
| 22 | JWT in localStorage | `AuthContext.jsx` | Readable by any JS on the page. Vulnerable to XSS. HttpOnly cookies are safer. |
| 23 | CSP fully disabled | `server/index.js:19` | `helmet({ contentSecurityPolicy: false })` removes primary browser XSS defense. |
| 24 | Optional packages lazy-required at runtime | `server/routes/export.js:21-26` | `require('html-to-docx')` / `require('mammoth')` inside route handlers. Fails at runtime with 501, not at startup. |

---

## 7. What Needs to Be Added

### Core Editor Features

**Inline formatting (missing)**
- Subscript / Superscript (beyond footnotes)
- Double strikethrough
- All-caps / Small-caps
- Character spacing (letter-spacing)
- Font border / shadow effects
- Font dialog (all font properties in one popup)
- **Format Painter** (copy formatting from one selection, apply to another — one of Word's most-used tools)

**Paragraph formatting (missing)**
- Space Before / Space After per paragraph
- First-line indent vs hanging indent
- Keep with next / Keep lines together (widow/orphan control)
- Tab stops (clickable ruler to place them)
- Named paragraph styles that can be modified

**Styles system (missing entirely)**
- Named styles (Normal, Heading 1, Body Text, etc.) with full definitions
- Styles panel / sidebar
- "Update style to match selection"

### Lists

- Multi-level lists (1 → 1.1 → 1.1.1 outline numbering)
- Custom numbering start value
- Custom bullet character / symbol
- List continuation across sections
- Numbered headings

### Page Layout

- **Headers and Footers** — editable areas per page, different first page, odd/even
- **Real pagination** — pages reflow; content splits across actual page boundaries
- **Dynamic page numbers** that count real pages
- **Section breaks** — change layout mid-document
- **Multi-column layout** (newspaper 2–3 column)
- **Landscape orientation** per section
- **Custom margin values** (numeric input, currently only 3 presets)
- **Watermark** (text/image behind content)
- **Page border**
- **Gutter margin** for bound documents

### Insert Features

- **Image upload** — drag-and-drop + file picker (currently URL-only)
- **Image resize** — drag handles after insert
- **Image alignment + text wrap** (inline / square / behind text)
- **Image crop**
- **Shapes** (rectangles, circles, arrows, lines)
- **Text boxes** (floating containers)
- **Drop cap**
- **Special characters / Symbol picker** (Ω, ©, ™, em dash, etc.)
- **Equations** (MathML)
- **Smart quotes** — auto-replace `"` with `""`
- **Auto-correct** — common typo correction
- **Date/time field** (auto-updating)
- **Page count field**
- **Cross-references** (refer to Figure 1, Table 2)
- **Bookmarks** (named anchor positions)
- **Caption** for images/tables

### Table Features (Major Gap)

- Column / row resize by dragging borders
- Add / remove rows and columns after insertion
- Merge and split cells
- Cell borders — style, color, thickness
- Cell shading / background color
- Cell padding and spacing
- Table alignment on page
- Built-in table styles (presets)
- Header row that repeats across pages
- Sort by column

### Review & Collaboration

- **Accept / Reject individual tracked changes** (not just all-at-once)
- **Track deletions** with `<del>` markup
- **Track formatting changes** (bold applied, color changed)
- **Show/hide markup modes** (show original, show final, show markup)
- **Named reviewers** on each tracked change with timestamp
- **Real-time collaborator cursors** — colored, named carets (server emits events; client never renders them)
- **Spell check** with suggestions popup (not just browser underline)
- **Grammar check**
- **Thesaurus**
- **Compare documents** (diff two versions visually side-by-side)
- **Protect document** (read-only, password, restrict editing to sections)

### Comments Improvements

- **Threaded replies** within a comment
- **@mention** collaborators
- **Robust anchoring** — use character offsets instead of DOM spans so undo doesn't orphan comments
- **Margin bubbles** connected to text by lines (like Google Docs)
- **Notifications** when someone comments

### Export / Import

- **PDF export** — most-requested; completely missing
- Better DOCX fidelity — current `html-to-docx` loses fonts, spacing, tables, colors
- Import `.odt` (OpenDocument)
- Import `.rtf`
- Proper print margins matching editor visual

### Document Management (Dashboard)

- **Folders / organization** — no grouping currently
- **Sort** by date / name / size
- **List view** vs grid view toggle
- **Real document thumbnails** — currently always the same fake placeholder bars; render actual doc preview
- **Duplicate document**
- **Templates** (blank, resume, letter, report)
- **Starred / pinned documents**
- **Trash / soft delete** with restore (currently hard-delete, permanent)
- **Recent documents** section
- **Storage quota display**

### User Account

- Change password
- Change display name
- Profile picture / avatar upload
- Email notifications (shared with you, comment added)
- Account deletion
- Activity log (who viewed/edited)

### Accessibility

- ARIA labels on all toolbar buttons
- Full keyboard navigation through ribbon
- Screen reader compatibility for `contentEditable` editor
- High-contrast mode
- Reduced-motion support for animations

### Technical / Architecture

- **Replace `document.execCommand` with ProseMirror / TipTap / Slate.js** — fixes font-size hack, enables proper cursor state in toolbar, enables OT/CRDT, removes deprecated API. **Single most impactful change.**
- **OT or CRDT for real-time collaboration** (e.g., Yjs, Automerge) — eliminates last-write-wins data loss
- **DOMPurify on all HTML rendering** — paste handler, version preview, shared view, any `dangerouslySetInnerHTML`
- **Paginated version history** — currently capped at 30 with no load-more
- **Paginated document list** on dashboard — no limit currently
- **Service worker / offline support**
- Move `html-to-docx` and `mammoth` to proper `dependencies` in `server/package.json`

---

## 8. Priority Roadmap

### P0 — Critical (Security + Data Loss)
| Item | Why |
|---|---|
| DOMPurify on paste + version preview | Stored XSS with active exploit path |
| OT/CRDT for collaboration | Silent data loss on simultaneous edits |
| Fix share link URL construction | Breaks in any production deployment |
| Enable CSP in Helmet | Primary XSS browser defense is off |
| Sanitize content on save (server-side) | Raw HTML stored in MongoDB without any sanitization |

### P1 — High (Core Word Features)
| Item | Why |
|---|---|
| Replace `execCommand` with TipTap/ProseMirror | Fixes toolbar state, font size, enables everything below |
| Real collaborator cursors | Core collaboration UX — already wired on server, dead on client |
| PDF export | #1 expected feature from a Word-like app |
| Real pagination | Without it the app is a rich textarea, not a word processor |
| Headers and footers | Standard in every document |
| Image upload + resize | URL-only is not viable for real use |
| Ribbon reflects cursor state | Bold/font/heading dropdowns always wrong |

### P2 — Medium (Completeness)
| Item |
|---|
| Accept/reject individual tracked changes |
| Track deletions + formatting changes |
| Table editing (resize, add/remove rows/cols, merge/split) |
| Paragraph spacing (before/after) |
| Styles panel + format painter |
| Comment threading + robust anchoring |
| Tab stops on ruler |

### P3 — Lower (Polish)
| Item |
|---|
| Folders and templates on dashboard |
| Real document thumbnails |
| Trash / soft delete |
| Special characters, symbols, equations |
| Shapes and text boxes |
| Spell check with suggestions |
| Multi-column layout |
| Watermark, page border |
| Offline / service worker |
| ARIA labels + keyboard navigation |

---

*End of audit. Last updated: 2026-04-12*
