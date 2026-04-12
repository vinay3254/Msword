import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { importDocx } from '../api/exportImport';

const SANITIZE_HTML_OPTIONS = {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['img'],
  ADD_ATTR: ['src', 'alt', 'width', 'height', 'style'],
};

const TEMPLATES = [
  { name: 'Blank', icon: '□', content: '', description: 'Start from scratch' },
  {
    name: 'Resume', icon: '◈', description: 'Professional resume layout',
    content: `<h1 style="text-align:center">Your Name</h1><p style="text-align:center">email@example.com | LinkedIn | GitHub</p><hr/><h2>Experience</h2><p><strong>Job Title</strong> - Company Name (Year - Year)</p><ul><li>Achievement or responsibility</li></ul><h2>Education</h2><p><strong>Degree</strong> - University Name (Year)</p><h2>Skills</h2><p>Skill 1, Skill 2, Skill 3</p>`,
  },
  {
    name: 'Cover Letter', icon: '◇', description: 'Professional cover letter',
    content: `<p>Date</p><br/><p>Hiring Manager's Name<br/>Company Name<br/>Address</p><br/><p>Dear Hiring Manager,</p><p>I am writing to express my interest in the [Position] role at [Company]...</p><p>Sincerely,<br/>Your Name</p>`,
  },
  {
    name: 'Meeting Notes', icon: '◉', description: 'Structured meeting notes',
    content: `<h1>Meeting Notes</h1><p><strong>Date:</strong> &nbsp; <strong>Attendees:</strong></p><h2>Agenda</h2><ul><li></li></ul><h2>Discussion</h2><p></p><h2>Action Items</h2><ul><li>[ ] Task - Owner - Due date</li></ul>`,
  },
  {
    name: 'Report', icon: '◫', description: 'Business report layout',
    content: `<h1 style="text-align:center">Report Title</h1><p style="text-align:center"><em>Author | Date | Version 1.0</em></p><hr/><h2>Executive Summary</h2><p></p><h2>Background</h2><p></p><h2>Findings</h2><p></p><h2>Recommendations</h2><p></p><h2>Conclusion</h2><p></p>`,
  },
];

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function DocThumb({ content }) {
  const previewHtml = content || '';
  const sanitized = DOMPurify.sanitize(previewHtml, SANITIZE_HTML_OPTIONS);
  return (
    <div style={{ width: '100%', height: 130, overflow: 'hidden', position: 'relative', background: '#fffef9', borderBottom: '1px solid #ede9e0' }}>
      <div
        style={{
          transform: 'scale(0.22)',
          transformOrigin: 'top left',
          width: '455%',
          height: '455%',
          padding: '16px',
          fontSize: '11pt',
          fontFamily: 'Georgia, serif',
          pointerEvents: 'none',
          userSelect: 'none',
          color: '#1a1a1a',
          lineHeight: 1.6,
        }}
        dangerouslySetInnerHTML={{ __html: sanitized || '<p style="color:#bbb;font-style:italic">Empty document</p>' }}
      />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, background: 'linear-gradient(transparent, #fffef9)' }} />
    </div>
  );
}

function DocThumbLazy({ content }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return undefined;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref}>
      {visible ? <DocThumb content={content} /> : <div style={{ height: 130, background: '#f5f2eb' }} />}
    </div>
  );
}

// ─── Injected styles ──────────────────────────────────────────────────────────
const DASH_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,300;1,9..144,400&family=Fira+Code:wght@400;500&display=swap');

  .dash-root {
    display: flex;
    min-height: 100vh;
    background: #0e0e0f;
    font-family: 'Fira Code', monospace;
  }

  /* ── Sidebar ── */
  .dash-sidebar {
    width: 280px;
    flex-shrink: 0;
    background: #0e0e0f;
    border-right: 1px solid #222224;
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
    z-index: 20;
  }

  .dash-brand {
    padding: 28px 28px 20px;
    border-bottom: 1px solid #1e1e20;
    flex-shrink: 0;
  }

  .dash-brand-mark {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dash-brand-glyph {
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

  .dash-brand-name {
    font-family: 'Fraunces', serif;
    font-size: 16px;
    font-weight: 500;
    color: #f5f2eb;
    letter-spacing: -0.3px;
    line-height: 1.1;
  }

  .dash-brand-sub {
    font-size: 9px;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-top: 1px;
  }

  .dash-greeting {
    padding: 24px 28px 20px;
    border-bottom: 1px solid #1a1a1c;
    flex-shrink: 0;
  }

  .dash-greeting-time {
    font-size: 9px;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 8px;
  }

  .dash-greeting-name {
    font-family: 'Fraunces', serif;
    font-size: 26px;
    font-weight: 300;
    font-style: italic;
    color: #f5f2eb;
    line-height: 1.1;
    letter-spacing: -0.5px;
  }

  .dash-greeting-name strong {
    font-weight: 700;
    font-style: normal;
    color: #e8b429;
  }

  /* ── Nav ── */
  .dash-nav {
    flex: 1;
    overflow-y: auto;
    padding: 16px 0;
  }

  .dash-nav::-webkit-scrollbar { width: 0; }

  .dash-nav-section {
    padding: 0 20px 8px;
  }

  .dash-nav-label {
    font-size: 8.5px;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 2.5px;
    padding: 8px 8px 6px;
    display: block;
  }

  .dash-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: #666;
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
    position: relative;
  }

  .dash-nav-item:hover {
    background: #18181a;
    color: #c8c4bc;
  }

  .dash-nav-item.active {
    background: #1a1a1c;
    color: #e8b429;
  }

  .dash-nav-item.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 20%;
    bottom: 20%;
    width: 2px;
    background: #e8b429;
    border-radius: 0 2px 2px 0;
  }

  .dash-nav-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
    opacity: 0.5;
  }

  .dash-nav-item.active .dash-nav-dot {
    opacity: 1;
    box-shadow: 0 0 6px #e8b429;
  }

  .dash-sidebar-footer {
    padding: 16px 28px;
    border-top: 1px solid #1a1a1c;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .dash-user-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
  }

  .dash-avatar {
    width: 28px;
    height: 28px;
    background: #e8b429;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 12px;
    color: #0e0e0f;
    flex-shrink: 0;
  }

  .dash-user-email {
    font-size: 10px;
    color: #555;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dash-signout {
    font-size: 10px;
    color: #444;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    font-family: 'Fira Code', monospace;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: color 0.15s;
  }
  .dash-signout:hover { color: #e05252; }

  /* ── Main ── */
  .dash-main {
    flex: 1;
    background: #faf8f4;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    overflow-x: hidden;
  }

  .dash-topbar {
    background: #faf8f4;
    border-bottom: 1px solid #e8e4dc;
    padding: 20px 40px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .dash-section-title {
    font-family: 'Fraunces', serif;
    font-size: 22px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: -0.5px;
    margin-right: auto;
  }

  /* ── Action buttons ── */
  .dash-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    background: #0e0e0f;
    color: #e8b429;
    border: none;
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    cursor: pointer;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    transition: all 0.15s;
    clip-path: polygon(0 0, 100% 0, 100% 70%, 94% 100%, 0 100%);
  }
  .dash-btn-primary:hover { background: #1e1e20; }
  .dash-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .dash-btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 16px;
    background: transparent;
    color: #4a4540;
    border: 1px solid #c8c4bc;
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    cursor: pointer;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    transition: all 0.15s;
  }
  .dash-btn-secondary:hover { border-color: #0e0e0f; background: #0e0e0f; color: #f5f2eb; }

  .dash-btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    background: transparent;
    color: #7a7570;
    border: none;
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    cursor: pointer;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    transition: all 0.15s;
  }
  .dash-btn-ghost:hover { color: #1a1a1a; }

  /* ── Search ── */
  .dash-search-wrap {
    position: relative;
    flex: 1;
    min-width: 180px;
    max-width: 300px;
  }

  .dash-search {
    width: 100%;
    padding: 8px 12px 8px 34px;
    background: #f0ede6;
    border: 1px solid #dedad2;
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    color: #1a1a1a;
    outline: none;
    transition: border-color 0.15s;
  }

  .dash-search::placeholder { color: #aaa9a5; }
  .dash-search:focus { border-color: #0e0e0f; background: #fff; }

  .dash-search-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #aaa;
    font-size: 13px;
    pointer-events: none;
  }

  .dash-search-clear {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #aaa;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0;
  }

  /* ── Content area ── */
  .dash-content {
    flex: 1;
    padding: 32px 40px 48px;
  }

  /* ── Error ── */
  .dash-error {
    background: #fff5f5;
    border: 1px solid #fecaca;
    border-left: 3px solid #ef4444;
    padding: 10px 16px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: #b91c1c;
  }

  /* ── Loading ── */
  .dash-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
    gap: 16px;
  }

  .dash-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid #e8e4dc;
    border-top-color: #e8b429;
    border-radius: 50%;
    animation: dash-spin 0.8s linear infinite;
  }

  @keyframes dash-spin { to { transform: rotate(360deg); } }

  .dash-loading-text {
    font-size: 10px;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  /* ── Empty state ── */
  .dash-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
    text-align: center;
    gap: 12px;
  }

  .dash-empty-glyph {
    font-family: 'Fraunces', serif;
    font-size: 72px;
    font-weight: 300;
    font-style: italic;
    color: #d8d4cc;
    line-height: 1;
    margin-bottom: 8px;
  }

  .dash-empty-title {
    font-family: 'Fraunces', serif;
    font-size: 20px;
    font-weight: 500;
    color: #4a4540;
  }

  .dash-empty-sub {
    font-size: 11px;
    color: #aaa9a5;
    letter-spacing: 0.3px;
  }

  /* ── Doc grid ── */
  .dash-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 20px;
  }

  /* ── Doc card ── */
  .dash-card {
    background: #fff;
    border: 1px solid #e8e4dc;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition: all 0.18s ease;
    position: relative;
    animation: dash-card-in 0.35s ease both;
  }

  @keyframes dash-card-in {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .dash-card:hover {
    border-color: #0e0e0f;
    box-shadow: 4px 4px 0 #0e0e0f;
    transform: translate(-2px, -2px);
  }

  /* Corner fold decoration */
  .dash-card::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 14px 14px 0;
    border-color: transparent #f0ede6 transparent transparent;
    transition: border-width 0.18s ease;
  }

  .dash-card:hover::after {
    border-width: 0 20px 20px 0;
    border-color: transparent #e8e4dc transparent transparent;
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
    font-family: 'Fraunces', serif;
    font-size: 13px;
    font-weight: 500;
    color: #1a1a1a;
    border: none;
    border-bottom: 1.5px solid #e8b429;
    outline: none;
    background: transparent;
    padding-bottom: 2px;
  }

  .dash-card-title {
    font-family: 'Fraunces', serif;
    font-size: 13px;
    font-weight: 500;
    color: #1a1a1a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3;
    transition: color 0.15s;
  }

  .dash-card:hover .dash-card-title { color: #0e0e0f; }

  .dash-card-meta {
    font-size: 9px;
    color: #aaa9a5;
    letter-spacing: 0.5px;
    margin-top: 3px;
  }

  .dash-card-folder {
    font-size: 9px;
    color: #b8b4ac;
    margin-top: 2px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  /* ── Card actions (reveal on hover) ── */
  .dash-card-actions {
    padding: 0 14px 12px;
    display: flex;
    gap: 0;
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition: max-height 0.2s ease, opacity 0.2s ease, padding 0.2s ease;
  }

  .dash-card:hover .dash-card-actions {
    max-height: 40px;
    opacity: 1;
  }

  .dash-card-action {
    flex: 1;
    padding: 6px 4px;
    border: none;
    background: #f5f2eb;
    color: #6a6560;
    font-family: 'Fira Code', monospace;
    font-size: 9px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: all 0.12s;
    border-right: 1px solid #e8e4dc;
  }

  .dash-card-action:last-child { border-right: none; }
  .dash-card-action:hover { background: #0e0e0f; color: #f5f2eb; }
  .dash-card-action.danger:hover { background: #ef4444; color: white; }
  .dash-card-action.restore:hover { background: #16a34a; color: white; }

  .dash-card-folder-select {
    width: 100%;
    margin-top: 6px;
    padding: 5px 8px;
    background: #f5f2eb;
    border: 1px solid #e0dcd4;
    font-family: 'Fira Code', monospace;
    font-size: 9px;
    color: #4a4540;
    cursor: pointer;
    outline: none;
  }

  /* ── Template modal ── */
  .dash-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(14,14,15,0.75);
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    backdrop-filter: blur(2px);
  }

  .dash-modal {
    background: #faf8f4;
    width: 100%;
    max-width: 780px;
    border: 1px solid #e8e4dc;
    box-shadow: 8px 8px 0 #0e0e0f;
    animation: dash-modal-in 0.22s ease;
  }

  @keyframes dash-modal-in {
    from { opacity: 0; transform: scale(0.96) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  .dash-modal-header {
    padding: 24px 32px 20px;
    border-bottom: 1px solid #e8e4dc;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .dash-modal-title {
    font-family: 'Fraunces', serif;
    font-size: 24px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: -0.5px;
  }

  .dash-modal-close {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 20px;
    color: #aaa;
    line-height: 1;
    transition: color 0.12s;
    padding: 0;
  }
  .dash-modal-close:hover { color: #1a1a1a; }

  .dash-modal-body {
    padding: 24px 32px 32px;
  }

  .dash-template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .dash-template-card {
    background: #fff;
    border: 1px solid #e0dcd4;
    padding: 20px;
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
  }

  .dash-template-card:hover {
    border-color: #0e0e0f;
    box-shadow: 3px 3px 0 #0e0e0f;
    transform: translate(-2px, -2px);
  }

  .dash-template-glyph {
    font-size: 22px;
    color: #0e0e0f;
    margin-bottom: 10px;
    font-family: 'Fraunces', serif;
    font-weight: 700;
  }

  .dash-template-name {
    font-family: 'Fraunces', serif;
    font-size: 15px;
    font-weight: 500;
    color: #1a1a1a;
    margin-bottom: 5px;
  }

  .dash-template-desc {
    font-size: 10px;
    color: #aaa9a5;
    letter-spacing: 0.3px;
    line-height: 1.5;
  }

  .dash-template-card:hover .dash-template-name { color: #0e0e0f; }

  /* ── Decorative stripe at bottom of sidebar ── */
  .dash-stripe {
    height: 3px;
    background: linear-gradient(90deg, #e8b429 0%, #e8b429 33%, #0e0e0f 33%, #0e0e0f 66%, #444 66%);
    flex-shrink: 0;
  }

  /* ── Divider in topbar ── */
  .dash-divider {
    width: 1px;
    height: 20px;
    background: #d0ccc4;
    flex-shrink: 0;
  }

  /* ── Count badge ── */
  .dash-count {
    font-size: 10px;
    color: #aaa;
    margin-left: auto;
    flex-shrink: 0;
  }
`;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [docs, setDocs] = useState([]);
  const [trashDocs, setTrashDocs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState('All Documents');
  const [showTrash, setShowTrash] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const searchTimer = useRef(null);

  const fetchFolders = async () => {
    try {
      const { data } = await api.get('/docs/folders');
      setFolders(data || []);
    } catch { /* non-blocking */ }
  };

  const fetchDocs = async (q = '') => {
    try {
      const { data } = await api.get('/docs', { params: q ? { search: q } : {} });
      setDocs(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrash = async () => {
    try {
      const { data } = await api.get('/docs/trash');
      setTrashDocs(data);
    } catch {
      setError('Failed to load trash');
    }
  };

  useEffect(() => { fetchDocs(); fetchFolders(); }, []);
  useEffect(() => { if (showTrash) fetchTrash(); }, [showTrash]);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchDocs(val), 300);
  };

  const createFromTemplate = async (template) => {
    setCreating(true);
    try {
      const { data } = await api.post('/docs', {
        title: template.name === 'Blank' ? 'Untitled Document' : template.name,
        content: template.content,
      });
      setShowTemplates(false);
      navigate(`/docs/${data._id}`);
    } catch {
      setError('Failed to create document from template');
      setCreating(false);
    }
  };

  const handleImportDocx = () => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.docx' });
    inp.onchange = async (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      setCreating(true);
      try {
        const { data: newDoc } = await api.post('/docs', { title: file.name.replace('.docx', '') });
        await importDocx(newDoc._id, file);
        navigate(`/docs/${newDoc._id}`);
      } catch {
        setError('Failed to import document. Make sure mammoth is installed on the server.');
        setCreating(false);
      }
    };
    inp.click();
  };

  const createFolder = (name) => {
    const folder = String(name || '').trim();
    if (!folder) return;
    setFolders(prev => prev.includes(folder) ? prev : [...prev, folder]);
  };

  const moveToFolder = async (docId, folder) => {
    try {
      await api.patch(`/docs/${docId}/folder`, { folder });
      setDocs(prev => prev.map(d => (d._id === docId ? { ...d, folder } : d)));
      createFolder(folder);
    } catch {
      setError('Failed to move document');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Move "${title}" to trash?`)) return;
    try {
      await api.delete(`/docs/${id}`);
      setDocs(prev => prev.filter(d => d._id !== id));
      fetchFolders();
    } catch {
      setError('Failed to move document to trash');
    }
  };

  const restoreDoc = async (id) => {
    try {
      await api.post(`/docs/${id}/restore`);
      setTrashDocs(prev => prev.filter(d => d._id !== id));
      fetchDocs(search);
      fetchFolders();
    } catch {
      setError('Failed to restore document');
    }
  };

  const permanentDelete = async (id) => {
    if (!window.confirm('Permanently delete this document?')) return;
    try {
      await api.delete(`/docs/${id}/permanent`);
      setTrashDocs(prev => prev.filter(d => d._id !== id));
    } catch {
      setError('Failed to permanently delete document');
    }
  };

  const startRename = (e, doc) => {
    e.stopPropagation();
    setEditingId(doc._id);
    setEditingTitle(doc.title);
  };

  const saveRename = async (id) => {
    const t = editingTitle.trim() || 'Untitled Document';
    setDocs(prev => prev.map(d => d._id === id ? { ...d, title: t } : d));
    setEditingId(null);
    try {
      await api.put(`/docs/${id}`, { title: t });
    } catch {
      setError('Failed to rename document');
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';

  const filteredDocs = activeFolder === 'All Documents'
    ? docs
    : docs.filter(d => (d.folder || 'My Documents') === activeFolder);

  const shownDocs = showTrash ? trashDocs : filteredDocs;
  const allFolders = ['All Documents', ...folders];

  return (
    <>
      <style>{DASH_STYLES}</style>

      <div className="dash-root">
        {/* ── Sidebar ── */}
        <aside className="dash-sidebar">
          {/* Brand */}
          <div className="dash-brand">
            <div className="dash-brand-mark">
              <div className="dash-brand-glyph">W</div>
              <div>
                <div className="dash-brand-name">MSWord</div>
                <div className="dash-brand-sub">Document Studio</div>
              </div>
            </div>
          </div>

          {/* Greeting */}
          <div className="dash-greeting">
            <div className="dash-greeting-time">{greeting}</div>
            <div className="dash-greeting-name">
              Good to see<br />you, <strong>{user?.name?.split(' ')[0] ?? 'there'}</strong>
            </div>
          </div>

          {/* Nav */}
          <nav className="dash-nav">
            {!showTrash && (
              <div className="dash-nav-section">
                <span className="dash-nav-label">Folders</span>
                {allFolders.map(f => (
                  <button
                    key={f}
                    className={`dash-nav-item ${activeFolder === f && !showTrash ? 'active' : ''}`}
                    onClick={() => { setShowTrash(false); setActiveFolder(f); }}
                  >
                    <span className="dash-nav-dot" />
                    {f}
                  </button>
                ))}
                <button
                  className="dash-nav-item"
                  style={{ marginTop: 4 }}
                  onClick={() => createFolder(window.prompt('Folder name:'))}
                >
                  <span style={{ fontSize: 14, lineHeight: 1, color: 'currentColor', opacity: 0.5 }}>+</span>
                  New Folder
                </button>
              </div>
            )}

            <div className="dash-nav-section" style={{ marginTop: 8 }}>
              <span className="dash-nav-label">Library</span>
              <button
                className={`dash-nav-item ${showTrash ? 'active' : ''}`}
                onClick={() => { setShowTrash(v => !v); if (!showTrash) setActiveFolder('All Documents'); }}
              >
                <span className="dash-nav-dot" />
                {showTrash ? 'Back to Documents' : 'Trash'}
              </button>
            </div>
          </nav>

          {/* Stripe */}
          <div className="dash-stripe" />

          {/* Footer */}
          <div className="dash-sidebar-footer">
            <div className="dash-user-chip">
              <div className="dash-avatar">{user?.name?.[0]?.toUpperCase() ?? '?'}</div>
              <div className="dash-user-email">{user?.email}</div>
            </div>
            <button className="dash-signout" onClick={logout}>Exit</button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="dash-main">
          {/* Topbar */}
          <div className="dash-topbar">
            <div className="dash-section-title">
              {showTrash ? 'Trash' : activeFolder}
            </div>

            {!showTrash && (
              <>
                <button
                  className="dash-btn-primary"
                  onClick={() => setShowTemplates(true)}
                  disabled={creating}
                >
                  {creating
                    ? <span className="dash-spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
                    : <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                  }
                  {creating ? 'Creating…' : 'New Doc'}
                </button>

                <button className="dash-btn-secondary" onClick={handleImportDocx} disabled={creating}>
                  ↑ Import .docx
                </button>

                <div className="dash-divider" />

                <div className="dash-search-wrap">
                  <span className="dash-search-icon">⌕</span>
                  <input
                    className="dash-search"
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Search docs…"
                  />
                  {search && (
                    <button className="dash-search-clear" onClick={() => handleSearch('')}>×</button>
                  )}
                </div>
              </>
            )}

            <span className="dash-count">
              {shownDocs.length} {shownDocs.length === 1 ? 'doc' : 'docs'}
            </span>
          </div>

          {/* Content */}
          <div className="dash-content">
            {error && (
              <div className="dash-error">
                <span>⚠ {error}</span>
                <button
                  onClick={() => setError('')}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
                >×</button>
              </div>
            )}

            {loading ? (
              <div className="dash-loading">
                <div className="dash-spinner" />
                <span className="dash-loading-text">Loading documents</span>
              </div>
            ) : shownDocs.length === 0 ? (
              <div className="dash-empty">
                <div className="dash-empty-glyph">
                  {showTrash ? '∅' : '◻'}
                </div>
                <div className="dash-empty-title">
                  {showTrash ? 'Trash is empty' : 'No documents yet'}
                </div>
                <div className="dash-empty-sub">
                  {showTrash ? 'Deleted documents will appear here' : 'Create a new document to get started'}
                </div>
              </div>
            ) : (
              <div className="dash-grid">
                {shownDocs.map((doc, i) => (
                  <div
                    key={doc._id}
                    className="dash-card"
                    style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
                  >
                    {/* Thumbnail */}
                    <div onClick={() => !showTrash && navigate(`/docs/${doc._id}`)}>
                      <DocThumbLazy content={doc.content} />
                    </div>

                    {/* Body */}
                    <div className="dash-card-body">
                      <div className="dash-card-title-wrap">
                        {editingId === doc._id ? (
                          <input
                            autoFocus
                            className="dash-card-title-input"
                            value={editingTitle}
                            onChange={e => setEditingTitle(e.target.value)}
                            onBlur={() => saveRename(doc._id)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveRename(doc._id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <div
                            className="dash-card-title"
                            title={doc.title}
                            onClick={() => !showTrash && navigate(`/docs/${doc._id}`)}
                          >
                            {doc.title || 'Untitled Document'}
                          </div>
                        )}
                      </div>
                      <div className="dash-card-meta">
                        {formatDate(showTrash ? doc.deletedAt || doc.updatedAt : doc.updatedAt)}
                      </div>
                      {!showTrash && (
                        <div className="dash-card-folder">
                          {doc.folder || 'My Documents'}
                        </div>
                      )}
                    </div>

                    {/* Actions (reveal on hover) */}
                    {showTrash ? (
                      <div className="dash-card-actions" style={{ maxHeight: 40, opacity: 1 }}>
                        <button
                          className="dash-card-action restore"
                          onClick={e => { e.stopPropagation(); restoreDoc(doc._id); }}
                        >
                          ↩ Restore
                        </button>
                        <button
                          className="dash-card-action danger"
                          onClick={e => { e.stopPropagation(); permanentDelete(doc._id); }}
                        >
                          ✕ Delete
                        </button>
                      </div>
                    ) : (
                      <div className="dash-card-actions">
                        <button
                          className="dash-card-action"
                          onClick={e => startRename(e, doc)}
                        >
                          Rename
                        </button>
                        <button
                          className="dash-card-action danger"
                          onClick={e => { e.stopPropagation(); handleDelete(doc._id, doc.title); }}
                        >
                          Trash
                        </button>
                        <div style={{ flex: 2, position: 'relative' }}>
                          <select
                            className="dash-card-folder-select"
                            value={doc.folder || 'My Documents'}
                            onChange={e => moveToFolder(doc._id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{ width: '100%', margin: 0, borderTop: '1px solid #e0dcd4', borderLeft: '1px solid #e0dcd4', borderRight: 'none', borderBottom: 'none' }}
                          >
                            {[...new Set(['My Documents', ...folders])].map(folder => (
                              <option key={folder} value={folder}>{folder}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Template modal ── */}
      {showTemplates && (
        <div className="dash-modal-overlay" onClick={() => setShowTemplates(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <div className="dash-modal-title">Choose a Template</div>
              <button className="dash-modal-close" onClick={() => setShowTemplates(false)}>×</button>
            </div>
            <div className="dash-modal-body">
              <div className="dash-template-grid">
                {TEMPLATES.map(t => (
                  <div
                    key={t.name}
                    className="dash-template-card"
                    onClick={() => createFromTemplate(t)}
                  >
                    <div className="dash-template-glyph">{t.icon}</div>
                    <div className="dash-template-name">{t.name}</div>
                    <div className="dash-template-desc">{t.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
