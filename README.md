# MSWord Clone — Full-Stack

A full-stack Microsoft Word clone built with React (Vite) + Tailwind CSS on the frontend, Node.js + Express on the backend, and MongoDB for persistence.

## Features

- **Auth** — Register / Login with JWT (stored in localStorage)
- **Dashboard** — Google Docs-style home listing all your documents
- **Editor** — Full ribbon toolbar (Home / Insert / Layout tabs)
  - Font family & size, Bold / Italic / Underline / Strikethrough
  - Text color & highlight color
  - Align left / center / right / justify
  - Bullet & numbered lists, indent / outdent
  - Heading styles (H1, H2, H3, Normal)
  - Insert table, insert image (URL), horizontal rule
  - Page size (A4 / Letter) & margins (Normal / Narrow / Wide)
  - Undo / Redo, clear formatting
- **Auto-save** — debounced 3-second save to MongoDB with indicator
- **Export** — Download as `.html` or `.txt`
- **Print** — `window.print()`

## Tech Stack

| Layer     | Tech                                      |
|-----------|-------------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS, React Router v6 |
| Backend   | Node.js, Express, express-validator, Helmet, CORS |
| Database  | MongoDB, Mongoose                         |
| Auth      | JWT (7-day), bcryptjs                     |
| Dev tools | concurrently, nodemon                     |

## Project Structure

```
msword-clone/
├── package.json          ← root (concurrently)
├── .env.example
├── server/
│   ├── index.js          ← Express app entry
│   ├── models/           ← User, Document
│   ├── routes/           ← /api/auth, /api/docs
│   └── middleware/       ← JWT auth guard
└── client/
    ├── vite.config.js
    └── src/
        ├── context/      ← AuthContext
        ├── api/          ← Axios instance + interceptor
        ├── components/   ← ProtectedRoute
        └── pages/        ← Login, Register, Dashboard, Editor
```

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`) or a MongoDB Atlas URI

### 1. Clone & install dependencies

```bash
git clone <repo-url>
cd msword-clone
npm run install-all
```

### 2. Configure environment

```bash
cp .env.example server/.env
```

Edit `server/.env`:
```
MONGO_URI=mongodb://localhost:27017/msword-clone
JWT_SECRET=choose-a-long-random-string
PORT=5000
```

### 3. Run in development

```bash
npm run dev
```

This starts:
- **Backend** on `http://localhost:5000`
- **Frontend** on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

### 4. Build for production

```bash
npm run build
# Serve client/dist with your preferred static server
# Run server with: cd server && npm start
```

## API Reference

### Auth
| Method | Route | Body | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | `{ name, email, password }` | Register new user |
| POST | `/api/auth/login` | `{ email, password }` | Login, returns JWT |

### Documents
All document routes require `Authorization: Bearer <token>` header.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/docs` | List all user documents |
| POST | `/api/docs` | Create new document |
| GET | `/api/docs/:id` | Get single document |
| PUT | `/api/docs/:id` | Update title + content |
| DELETE | `/api/docs/:id` | Delete document (owner only) |

## Standalone Version

The root `index.html` + `MSWord.jsx` are a fully self-contained browser-only version that requires no server. Open `index.html` directly in Chrome/Edge to use without any setup.
