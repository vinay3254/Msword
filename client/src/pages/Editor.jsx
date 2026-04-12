import { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { aiAutocomplete } from '../api/ai';
import useEditor from '../hooks/useEditor';
import useCollaboration from '../hooks/useCollaboration';
import { createVersion } from '../api/versions';
import { exportDocx, exportPdf, importDocx } from '../api/exportImport';
import AIToolbar from '../components/editor/AIToolbar';
import Ribbon from '../components/editor/Ribbon';
import Ruler  from '../components/editor/Ruler';
import FindReplaceModal    from '../components/modals/FindReplaceModal';
import TableDialog         from '../components/modals/TableDialog';
import ImageDialog         from '../components/modals/ImageDialog';
import LinkDialog          from '../components/modals/LinkDialog';
import ShareModal          from '../components/modals/ShareModal';
import WordCountModal      from '../components/modals/WordCountModal';
import SymbolPicker        from '../components/modals/SymbolPicker';
import AIChatPanel         from '../components/panels/AIChatPanel';
import VersionHistoryPanel from '../components/panels/VersionHistoryPanel';
import CommentsPanel       from '../components/panels/CommentsPanel';

const SANITIZE_HTML_OPTIONS = {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['img'],
  ADD_ATTR: ['src', 'alt', 'width', 'height', 'style', 'class'],
  FORBID_TAGS: ['script', 'style'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick'],
};
const FONT_THEME_PRESETS = {
  default: { label: 'Default', family: 'Calibri' },
  classic: { label: 'Classic', family: 'Times New Roman' },
  modern: { label: 'Modern', family: 'Inter, Arial, sans-serif' },
};
const COLOR_THEME_PRESETS = {
  default: { label: 'Default', page: '#ffffff', text: '#111827', canvas: '#606060' },
  dark: { label: 'Dark', page: '#1f2937', text: '#f9fafb', canvas: '#374151' },
  sepia: { label: 'Sepia', page: '#f4ecd8', text: '#5b4636', canvas: '#a79070' },
};

const PAGE_DIMS = {
  A4:     { width: 794, minHeight: 1123 },
  Letter: { width: 816, minHeight: 1056 },
  Legal:  { width: 816, minHeight: 1344 },
};
const MARGIN_VALS = {
  normal: { t: 96, r: 96, b: 96, l: 96 },
  narrow: { t: 48, r: 48, b: 48, l: 48 },
  wide:   { t: 96, r: 192, b: 96, l: 192 },
};

const TRACKABLE_INPUT_TYPES = new Set([
  'insertText',
  'deleteContentBackward',
  'deleteContentForward',
  'deleteByCut',
  'insertFromPaste',
]);

const FORMATTING_COMMANDS = new Set([
  'bold', 'italic', 'underline', 'strikeThrough', 'justifyLeft', 'justifyCenter',
  'justifyRight', 'justifyFull', 'insertUnorderedList', 'insertOrderedList',
  'indent', 'outdent', 'removeFormat', 'foreColor', 'hiliteColor', 'fontName',
  'formatBlock', 'unlink',
]);

const NAMED_STYLES = {
  Normal:    { fontFamily: 'Calibri', fontSize: '11pt', fontWeight: 'normal', color: '#000000' },
  'Heading 1': { fontFamily: 'Calibri Light', fontSize: '16pt', fontWeight: 'bold', color: '#2e74b5' },
  'Heading 2': { fontFamily: 'Calibri Light', fontSize: '13pt', fontWeight: 'bold', color: '#2e74b5' },
  'Heading 3': { fontFamily: 'Calibri Light', fontSize: '12pt', fontWeight: 'bold', color: '#1f497d' },
  Title:     { fontFamily: 'Calibri Light', fontSize: '28pt', fontWeight: 'normal', color: '#000000' },
  Subtitle:  { fontFamily: 'Calibri Light', fontSize: '13pt', fontWeight: 'normal', color: '#595959' },
  Quote:     { fontFamily: 'Calibri', fontSize: '11pt', fontStyle: 'italic', color: '#595959' },
};

function stripTrackControlsFromHTML(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html || '';
  wrap.querySelectorAll('.tc-actions').forEach(el => el.remove());
  return wrap.innerHTML;
}

function fixImageUrls(html) {
  return String(html || '').replace(/http:\/\/localhost:5173\/uploads\//g, 'http://localhost:5000/uploads/');
}

function formatChangeMeta(author, time, action) {
  return `${author} • ${action} • ${new Date(time).toLocaleString()}`;
}

const PRESET_MARGIN_CM = {
  normal: { top: '2.54cm', right: '2.54cm', bottom: '2.54cm', left: '2.54cm' },
  narrow: { top: '1.27cm', right: '1.27cm', bottom: '1.27cm', left: '1.27cm' },
  wide: { top: '2.54cm', right: '5.08cm', bottom: '2.54cm', left: '5.08cm' },
};

const pxToCm = (px) => `${(px / 37.795).toFixed(2)}cm`;
const cmToPx = (value) => {
  if (!value) return 96;
  const num = parseFloat(String(value));
  if (Number.isNaN(num)) return 96;
  return String(value).includes('cm') ? num * 37.795 : num;
};

const BASE_DICTIONARY = new Set([
  'a','about','after','all','also','an','and','any','are','as','at','back','be','because','been','before','but','by',
  'can','could','day','do','document','each','even','first','for','from','get','go','good','great','had','has','have',
  'he','her','here','him','his','how','i','if','in','into','is','it','its','just','know','last','like','make','many',
  'me','more','most','my','new','no','not','now','of','on','one','only','or','other','our','out','over','page','people',
  'please','report','save','see','set','she','should','so','some','text','than','that','the','their','them','then',
  'there','these','they','this','time','to','today','two','up','use','using','version','was','we','were','what','when',
  'which','who','will','with','word','work','would','you','your'
]);

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function getWordRangeAtPoint(x, y) {
  const caretRange = document.caretRangeFromPoint
    ? document.caretRangeFromPoint(x, y)
    : (() => {
      const pos = document.caretPositionFromPoint?.(x, y);
      if (!pos) return null;
      const r = document.createRange();
      r.setStart(pos.offsetNode, pos.offset);
      r.collapse(true);
      return r;
    })();

  if (!caretRange) return null;
  const node = caretRange.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent || '';
  let start = caretRange.startOffset;
  let end = caretRange.startOffset;
  const isWord = (ch) => /[A-Za-z']/u.test(ch || '');
  while (start > 0 && isWord(text[start - 1])) start -= 1;
  while (end < text.length && isWord(text[end])) end += 1;
  if (start === end) return null;
  const word = text.slice(start, end);
  if (!/^[A-Za-z']+$/u.test(word)) return null;
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  return { word, range };
}

export default function Editor() {
  const { id: docId } = useParams();
  const navigate      = useNavigate();
  const { user, token } = useAuth();

  const [doc,        setDoc]        = useState(null);
  const [title,      setTitle]      = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const [pageSize,        setPageSize]        = useState('A4');
  const [margins,         setMargins]         = useState('normal');
  const [customMargins,   setCustomMargins]   = useState(null);
  const [lineSpacing,     setLineSpacing]     = useState('1.15');
  const [showPageNumbers, setShowPageNumbers] = useState(false);
  const [pageCount,       setPageCount]       = useState(1);
  const [currentPage,     setCurrentPage]     = useState(1);
  const [activeTab,       setActiveTab]       = useState('home');
  const [showRuler,       setShowRuler]       = useState(true);
  const [zoom,            setZoom]            = useState(100);
  const [darkMode,        setDarkMode]        = useState(false);
  const [focusMode,       setFocusMode]       = useState(false);
  const [contentOverflows, setContentOverflows] = useState(false);
  const [drawMode,        setDrawMode]        = useState(false);
  const [pageColor,       setPageColor]       = useState(COLOR_THEME_PRESETS.default.page);
  const [pageTextColor,   setPageTextColor]   = useState(COLOR_THEME_PRESETS.default.text);
  const [watermarkText,   setWatermarkText]   = useState('');
  const [pageBorder,      setPageBorder]      = useState(false);
  const [fontTheme,       setFontTheme]       = useState('default');
  const [colorTheme,      setColorTheme]      = useState('default');

  const [fontFamily,     setFontFamily]     = useState('Calibri');
  const [fontSize,       setFontSize]       = useState('11');
  const [textColor,      setTextColor]      = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#FFFF00');
  const [trackChanges,   setTrackChanges]   = useState(false);
  const [tcBaseSnapshot, setTCBaseSnapshot] = useState('');
  const [headerContent, setHeaderContent] = useState('');
  const [footerContent, setFooterContent] = useState('');
  const [showHeaderFooter, setShowHeaderFooter] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [editingFooter, setEditingFooter] = useState(false);
  const [selectionState, setSelectionState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    fontFamily: 'Calibri',
    fontSize: '11',
    heading: 'p',
  });

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [docComments, setDocComments] = useState([]);
  const [orphanedCommentIds, setOrphanedCommentIds] = useState([]);

  const [showFindReplace,    setShowFindReplace]    = useState(false);
  const [showTableDialog,    setShowTableDialog]    = useState(false);
  const [showImageDialog,    setShowImageDialog]    = useState(false);
  const [showLinkDialog,     setShowLinkDialog]     = useState(false);
  const [showShareModal,     setShowShareModal]     = useState(false);
  const [showWordCount,      setShowWordCount]      = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showComments,       setShowComments]       = useState(false);
  const [showAIPanel,        setShowAIPanel]        = useState(false);
  const [showSymbolPicker,   setShowSymbolPicker]   = useState(false);
  const [tableMenu, setTableMenu] = useState({ visible: false, x: 0, y: 0, cell: null });
  const [spellMenu, setSpellMenu] = useState({ visible: false, x: 0, y: 0, word: '', suggestions: [] });
  const [formatPainterActive, setFormatPainterActive] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState(null);
  const [ignoredWords, setIgnoredWords] = useState(() => {
    try {
      const raw = localStorage.getItem('msword.ignoredWords');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

  const ed = useEditor();
  const editorContainerRef = useRef(null);
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const spellRangeRef = useRef(null);

  const saveTimerRef       = useRef(null);
  const lastVersionContent = useRef('');
  const titleRef           = useRef(title);
  const pageSizeRef        = useRef(pageSize);
  const marginsRef         = useRef(margins);
  const customMarginsRef   = useRef(customMargins);
  const headerContentRef   = useRef(headerContent);
  const footerContentRef   = useRef(footerContent);
  titleRef.current    = title;
  pageSizeRef.current = pageSize;
  marginsRef.current  = margins;
  customMarginsRef.current = customMargins;
  headerContentRef.current = headerContent;
  footerContentRef.current = footerContent;

  const save = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const content = stripTrackControlsFromHTML(ed.getHTML());
      await api.put(`/docs/${docId}`, {
        title:    titleRef.current,
        content,
        pageSize: pageSizeRef.current,
        margins:  marginsRef.current,
        customMargins: customMarginsRef.current || undefined,
        headerContent: headerContentRef.current,
        footerContent: footerContentRef.current,
      });
      setSaveStatus('saved');
      if (Math.abs(content.length - lastVersionContent.current.length) > 250) {
        lastVersionContent.current = content;
        createVersion(docId).catch(() => {});
      }
    } catch {
      setSaveStatus('error');
    }
  }, [docId, ed]);

  const scheduleSave = useCallback(() => {
    setSaveStatus('unsaved');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 2000);
  }, [save]);

  const updatePageCount = useCallback(() => {
    const editor = ed.editorRef.current;
    if (!editor) return;
    const pageHeightPx = pageSize === 'A4' ? 1122 : pageSize === 'Letter' ? 1056 : 1344;
    const contentHeight = editor.scrollHeight;
    const count = Math.max(1, Math.ceil(contentHeight / pageHeightPx));
    setPageCount(count);
    setCurrentPage(prev => Math.min(prev, count));
  }, [ed.editorRef, pageSize]);

  const pageClass = pageSize.toLowerCase();

  const handleScroll = useCallback(() => {
    const container = editorContainerRef.current;
    if (!container) return;
    const pageHeightPx = pageSize === 'A4' ? 1122 : pageSize === 'Letter' ? 1056 : 1344;
    const nextPage = Math.min(pageCount, Math.max(1, Math.floor(container.scrollTop / pageHeightPx) + 1));
    setCurrentPage(nextPage);
  }, [pageSize, pageCount]);

  const checkOrphanedComments = useCallback(() => {
    if (!ed.editorRef.current || !docComments.length) return;
    const lost = docComments
      .filter(comment => !ed.editorRef.current.querySelector(`[data-comment-id="${comment.anchorId}"]`))
      .map(comment => comment._id);
    setOrphanedCommentIds(prev => Array.from(new Set([...prev, ...lost])));
  }, [docComments, ed.editorRef]);

  const handleRemoteUpdate = useCallback((html) => {
    if (ed.editorRef.current) {
      ed.saveRange();
      ed.editorRef.current.innerHTML = DOMPurify.sanitize(html, SANITIZE_HTML_OPTIONS);
      ed.restoreRange();
    }
  }, [ed]);

  const { emitContent, collaboratorCursors } = useCollaboration({
    docId, user, token,
    onRemoteUpdate: handleRemoteUpdate,
    onUsersChange: setOnlineUsers,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/docs/${docId}`);
        setDoc(data);
        setTitle(data.title || 'Untitled Document');
        setPageSize(data.pageSize || 'A4');
        setMargins(data.margins   || 'normal');
        setCustomMargins(data.customMargins?.top ? data.customMargins : null);
        setHeaderContent(data.headerContent || '');
        setFooterContent(data.footerContent || '');
        if (ed.editorRef.current) {
          const html = DOMPurify.sanitize(
            fixImageUrls(data.content || '<p><br></p>'),
            SANITIZE_HTML_OPTIONS
          );
          ed.editorRef.current.innerHTML = html;
          ed.pushHistory(html);
          lastVersionContent.current = html;
          updatePageCount();
        }
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load document');
      } finally {
        setLoading(false);
      }
    })();
  }, [docId, updatePageCount]); // eslint-disable-line

  const handleInput = useCallback(() => {
    const cleanHTML = stripTrackControlsFromHTML(ed.getHTML());
    if (!trackChanges) ed.pushHistory(cleanHTML);
    scheduleSave();
    emitContent(cleanHTML);
    updatePageCount();
  }, [ed, scheduleSave, emitContent, trackChanges, updatePageCount]);

  const updateSelectionState = useCallback(() => {
    const editor = ed.editorRef.current;
    if (!editor) return;

    const sel = window.getSelection();
    const node = sel?.anchorNode;
    if (node && !editor.contains(node)) return;

    const normalizeHeading = (heading) => {
      if (!heading) return 'p';
      const normalized = String(heading).toLowerCase().replace(/[<>]/g, '').trim();
      return ['p', 'h1', 'h2', 'h3', 'h4'].includes(normalized) ? normalized : 'p';
    };

    const normalizeFamily = (family) => {
      if (!family) return 'Calibri';
      return String(family).replace(/^"|"$/g, '').split(',')[0].trim() || 'Calibri';
    };

    const getCurrentFontSize = () => {
      if (node) {
        const el = node.nodeType === 1 ? node : node.parentElement;
        if (el) {
          const px = parseFloat(window.getComputedStyle(el).fontSize);
          if (!Number.isNaN(px)) return String(Math.round(px * 72 / 96));
        }
      }
      const level = document.queryCommandValue('fontSize');
      const levelMap = { '1': '8', '2': '10', '3': '12', '4': '14', '5': '18', '6': '24', '7': '36' };
      return levelMap[String(level)] || '11';
    };

    setSelectionState({
      bold: !!document.queryCommandState('bold'),
      italic: !!document.queryCommandState('italic'),
      underline: !!document.queryCommandState('underline'),
      strikethrough: !!document.queryCommandState('strikeThrough'),
      fontFamily: normalizeFamily(document.queryCommandValue('fontName')),
      fontSize: getCurrentFontSize(),
      heading: normalizeHeading(document.queryCommandValue('formatBlock')),
    });
  }, [ed.editorRef]);

  const commitDomMutation = useCallback(() => {
    const cleanHTML = stripTrackControlsFromHTML(ed.getHTML());
    if (!trackChanges) {
      ed.pushHistory(cleanHTML);
    }
    scheduleSave();
    emitContent(cleanHTML);
    updatePageCount();
    updateSelectionState();
  }, [ed, trackChanges, scheduleSave, emitContent, updatePageCount, updateSelectionState]);

  const handleAIReplace = useCallback((newText) => {
    const editor = ed.editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(newText);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      document.execCommand('insertText', false, newText);
    }
    commitDomMutation();
  }, [ed, commitDomMutation]);

  const handleAIInsert = useCallback((html) => {
    const editor = ed.editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount === 0) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    document.execCommand('insertHTML', false, html);
    scheduleSave();
    commitDomMutation();
  }, [ed, scheduleSave, commitDomMutation]);

  const getSuggestionPool = useCallback(() => {
    const pool = new Set(BASE_DICTIONARY);
    const text = ed.editorRef.current?.innerText || '';
    const words = text.match(/[A-Za-z']{3,}/g) || [];
    const counts = new Map();
    words.forEach((w) => {
      const key = w.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    counts.forEach((count, word) => {
      if (count >= 2) pool.add(word);
    });
    ignoredWords.forEach((w) => pool.add(String(w).toLowerCase()));
    return pool;
  }, [ed.editorRef, ignoredWords]);

  const getWordSuggestions = useCallback((word) => {
    const needle = String(word || '').toLowerCase();
    if (!needle || needle.length < 3) return [];
    const pool = getSuggestionPool();
    const candidates = [];
    pool.forEach((entry) => {
      if (Math.abs(entry.length - needle.length) > 2) return;
      const dist = levenshtein(needle, entry);
      if (dist <= 2) candidates.push({ entry, dist });
    });
    return candidates
      .sort((a, b) => a.dist - b.dist || a.entry.length - b.entry.length)
      .slice(0, 6)
      .map((item) => item.entry);
  }, [getSuggestionPool]);

  const replaceMisspelledWord = useCallback((replacement) => {
    const range = spellRangeRef.current;
    if (!range || !replacement) return;
    range.deleteContents();
    range.insertNode(document.createTextNode(replacement));
    spellRangeRef.current = null;
    setSpellMenu({ visible: false, x: 0, y: 0, word: '', suggestions: [] });
    commitDomMutation();
  }, [commitDomMutation]);

  const ignoreWord = useCallback((word) => {
    const lower = String(word || '').toLowerCase();
    if (!lower) return;
    setIgnoredWords((prev) => {
      const next = new Set(prev);
      next.add(lower);
      localStorage.setItem('msword.ignoredWords', JSON.stringify(Array.from(next)));
      return next;
    });
    spellRangeRef.current = null;
    setSpellMenu({ visible: false, x: 0, y: 0, word: '', suggestions: [] });
  }, []);

  const activateFormatPainter = useCallback(() => {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    setCopiedFormat({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      fontName: document.queryCommandValue('fontName'),
      fontSize: document.queryCommandValue('fontSize'),
      foreColor: document.queryCommandValue('foreColor'),
    });
    setFormatPainterActive(true);
    if (ed.editorRef.current) ed.editorRef.current.style.cursor = 'crosshair';
  }, [ed.editorRef]);

  const applyNamedStyle = useCallback((styleName) => {
    const style = NAMED_STYLES[styleName];
    if (!style) return;
    document.execCommand('styleWithCSS', false, true);
    if (style.fontFamily) document.execCommand('fontName', false, style.fontFamily);
    if (style.fontSize) document.execCommand('fontSize', false, '7');
    if (style.fontWeight === 'bold') document.execCommand('bold', false, null);
    if (style.fontStyle === 'italic') document.execCommand('italic', false, null);
    if (style.color) document.execCommand('foreColor', false, style.color);
    ed.editorRef.current?.querySelectorAll('font[size="7"]').forEach(el => {
      el.style.fontSize = style.fontSize;
      el.removeAttribute('size');
    });
    commitDomMutation();
  }, [commitDomMutation, ed.editorRef]);

  const handleEditorContextMenu = useCallback((e) => {
    const cell = e.target.closest('td, th');
    if (cell) {
      e.preventDefault();
      setSpellMenu({ visible: false, x: 0, y: 0, word: '', suggestions: [] });
      setTableMenu({ visible: true, x: e.clientX, y: e.clientY, cell });
      return;
    }

    setTableMenu({ visible: false, x: 0, y: 0, cell: null });
    const atPoint = getWordRangeAtPoint(e.clientX, e.clientY);
    if (!atPoint) {
      setSpellMenu({ visible: false, x: 0, y: 0, word: '', suggestions: [] });
      return;
    }

    const lower = atPoint.word.toLowerCase();
    const looksProperNoun = /^[A-Z]/.test(atPoint.word);
    const pool = getSuggestionPool();
    if (looksProperNoun || pool.has(lower)) {
      setSpellMenu({ visible: false, x: 0, y: 0, word: '', suggestions: [] });
      return;
    }

    const suggestions = getWordSuggestions(atPoint.word);
    e.preventDefault();
    spellRangeRef.current = atPoint.range;
    setSpellMenu({ visible: true, x: e.clientX, y: e.clientY, word: atPoint.word, suggestions });
  }, [getSuggestionPool, getWordSuggestions]);

  const handleCellClick = useCallback((e) => {
    if (!e.ctrlKey) return;
    e.target.closest('td, th')?.classList.toggle('tc-selected');
  }, []);

  const insertRowBelow = useCallback((cell) => {
    const row = cell?.closest('tr');
    if (!row) return;
    const colCount = row.cells.length;
    const newRow = document.createElement('tr');
    for (let i = 0; i < colCount; i += 1) {
      const td = document.createElement('td');
      td.innerHTML = '<br/>';
      newRow.appendChild(td);
    }
    row.parentNode.insertBefore(newRow, row.nextSibling);
    setTableMenu(prev => ({ ...prev, visible: false }));
    commitDomMutation();
  }, [commitDomMutation]);

  const insertRowAbove = useCallback((cell) => {
    const row = cell?.closest('tr');
    if (!row) return;
    const colCount = row.cells.length;
    const newRow = document.createElement('tr');
    for (let i = 0; i < colCount; i += 1) {
      const td = document.createElement('td');
      td.innerHTML = '<br/>';
      newRow.appendChild(td);
    }
    row.parentNode.insertBefore(newRow, row);
    setTableMenu(prev => ({ ...prev, visible: false }));
    commitDomMutation();
  }, [commitDomMutation]);

  const insertColRight = useCallback((cell) => {
    const table = cell?.closest('table');
    if (!table) return;
    const colIndex = cell.cellIndex;
    table.querySelectorAll('tr').forEach((row, i) => {
      const td = document.createElement(i === 0 ? 'th' : 'td');
      td.innerHTML = '<br/>';
      const ref = row.cells[colIndex + 1] || null;
      row.insertBefore(td, ref);
    });
    setTableMenu(prev => ({ ...prev, visible: false }));
    commitDomMutation();
  }, [commitDomMutation]);

  const insertColLeft = useCallback((cell) => {
    const table = cell?.closest('table');
    if (!table) return;
    const colIndex = cell.cellIndex;
    table.querySelectorAll('tr').forEach((row, i) => {
      const td = document.createElement(i === 0 ? 'th' : 'td');
      td.innerHTML = '<br/>';
      row.insertBefore(td, row.cells[colIndex]);
    });
    setTableMenu(prev => ({ ...prev, visible: false }));
    commitDomMutation();
  }, [commitDomMutation]);

  const deleteRow = useCallback((cell) => {
    const row = cell?.closest('tr');
    if (!row) return;
    row.remove();
    setTableMenu(prev => ({ ...prev, visible: false }));
    commitDomMutation();
  }, [commitDomMutation]);

  const deleteCol = useCallback((cell) => {
    const table = cell?.closest('table');
    if (!table) return;
    const colIndex = cell.cellIndex;
    table.querySelectorAll('tr').forEach(row => {
      if (row.cells[colIndex]) row.deleteCell(colIndex);
    });
    setTableMenu(prev => ({ ...prev, visible: false }));
    commitDomMutation();
  }, [commitDomMutation]);

  const deleteTable = useCallback((cell) => {
    const table = cell?.closest('table');
    if (!table) return;
    table.remove();
    setTableMenu(prev => ({ ...prev, visible: false }));
    commitDomMutation();
  }, [commitDomMutation]);

  const mergeCells = useCallback((cell) => {
    const table = cell?.closest('table');
    if (!table) return;
    const selected = [...table.querySelectorAll('td.tc-selected, th.tc-selected')];
    if (selected.length < 2) return;
    const first = selected[0];
    selected.slice(1).forEach(td => {
      first.innerHTML += ` ${td.innerHTML}`;
      first.colSpan = (first.colSpan || 1) + (td.colSpan || 1);
      td.remove();
    });
    selected.forEach(td => td.classList.remove('tc-selected'));
    setTableMenu(prev => ({ ...prev, visible: false }));
    commitDomMutation();
  }, [commitDomMutation]);

  const splitCell = useCallback((cell) => {
    if (!cell) return;
    const span = cell.colSpan || 1;
    if (span <= 1) return;
    const row = cell.closest('tr');
    for (let i = 1; i < span; i += 1) {
      const td = document.createElement('td');
      td.innerHTML = '<br/>';
      row.insertBefore(td, cell.nextSibling);
    }
    cell.colSpan = 1;
    setTableMenu(prev => ({ ...prev, visible: false }));
    commitDomMutation();
  }, [commitDomMutation]);

  const ensureTrackChangeMeta = useCallback((node, type, actionLabel) => {
    const author = user?.name || 'User';
    const time = new Date().toISOString();
    node.className = type;
    node.setAttribute('data-author', author);
    node.setAttribute('data-time', time);
    node.title = formatChangeMeta(author, time, actionLabel);
  }, [user]);

  const decorateTrackChangeNodes = useCallback(() => {
    const editor = ed.editorRef.current;
    if (!editor) return;

    editor.querySelectorAll('ins.tc-ins, del.tc-del').forEach(node => {
      if (!node.querySelector('.tc-actions')) {
        const actions = document.createElement('span');
        actions.className = 'tc-actions';
        actions.contentEditable = 'false';
        actions.innerHTML = `<span class="tc-accept" onclick="window.__tcAccept(this)">✓ Accept</span><span class="tc-reject" onclick="window.__tcReject(this)">✗ Reject</span>`;
        node.appendChild(actions);
      }

      if (!node.getAttribute('title')) {
        const author = node.getAttribute('data-author') || (user?.name || 'User');
        const time = node.getAttribute('data-time') || new Date().toISOString();
        node.title = formatChangeMeta(author, time, node.tagName === 'INS' ? 'inserted' : 'deleted');
      }
    });
  }, [ed.editorRef, user]);

  useEffect(() => {
    window.__tcAccept = (btn) => {
      const span = btn?.closest?.('.tc-ins, .tc-del');
      if (!span) return;
      if (span.classList.contains('tc-ins')) {
        span.replaceWith(...Array.from(span.childNodes).filter(n => !n.classList?.contains?.('tc-actions')));
      } else {
        span.remove();
      }
      commitDomMutation();
    };

    window.__tcReject = (btn) => {
      const span = btn?.closest?.('.tc-ins, .tc-del');
      if (!span) return;
      if (span.classList.contains('tc-ins')) {
        span.remove();
      } else {
        span.replaceWith(...Array.from(span.childNodes).filter(n => !n.classList?.contains?.('tc-actions')));
      }
      commitDomMutation();
    };

    return () => {
      delete window.__tcAccept;
      delete window.__tcReject;
    };
  }, [commitDomMutation]);

  useEffect(() => {
    const editor = ed.editorRef.current;
    if (!editor || !trackChanges) return;

    const applyDeletion = (inputType) => {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;

      if (sel.isCollapsed && typeof sel.modify === 'function') {
        sel.modify('extend', inputType === 'deleteContentBackward' ? 'backward' : 'forward', 'character');
      }

      if (sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      const del = document.createElement('del');
      ensureTrackChangeMeta(del, 'tc-del', 'deleted');

      try {
        const frag = range.extractContents();
        del.appendChild(frag);
        range.insertNode(del);
        sel.removeAllRanges();
        const nr = document.createRange();
        nr.setStartAfter(del);
        nr.collapse(true);
        sel.addRange(nr);
      } catch {
        document.execCommand('foreColor', false, '#ef4444');
      }
    };

    const insertTrackedText = (text, actionLabel) => {
      if (!text) return;
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();

      const ins = document.createElement('ins');
      ensureTrackChangeMeta(ins, 'tc-ins', actionLabel);
      ins.textContent = text;
      range.insertNode(ins);

      sel.removeAllRanges();
      const nr = document.createRange();
      nr.setStartAfter(ins);
      nr.collapse(true);
      sel.addRange(nr);
    };

    const onBeforeInput = (e) => {
      if (!TRACKABLE_INPUT_TYPES.has(e.inputType)) return;
      e.preventDefault();

      if (e.inputType === 'insertText') {
        insertTrackedText(e.data || '', 'inserted');
      }

      if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward' || e.inputType === 'deleteByCut') {
        applyDeletion(e.inputType);
      }

      if (e.inputType === 'insertFromPaste') {
        const pastedText = e.dataTransfer?.getData('text/plain') || '';
        insertTrackedText(pastedText, 'pasted');
      }

      decorateTrackChangeNodes();
      scheduleSave();
      emitContent(stripTrackControlsFromHTML(ed.getHTML()));
      updatePageCount();
      updateSelectionState();
    };

    editor.addEventListener('beforeinput', onBeforeInput);
    decorateTrackChangeNodes();

    return () => {
      editor.removeEventListener('beforeinput', onBeforeInput);
    };
  }, [trackChanges, ensureTrackChangeMeta, decorateTrackChangeNodes, scheduleSave, emitContent, ed, updatePageCount, updateSelectionState]);

  const acceptAllChanges = useCallback(() => {
    const el = ed.editorRef.current; if (!el) return;
    el.querySelectorAll('.tc-actions').forEach(a => a.remove());
    el.querySelectorAll('del.tc-del').forEach(d => d.remove());
    el.querySelectorAll('ins.tc-ins').forEach(i => i.replaceWith(...i.childNodes));
    el.normalize();
    setTrackChanges(false);
    setTCBaseSnapshot('');
    ed.pushHistory(el.innerHTML);
    scheduleSave();
    updatePageCount();
  }, [ed, scheduleSave]);

  const rejectAllChanges = useCallback(() => {
    const el = ed.editorRef.current; if (!el) return;
    if (tcBaseSnapshot) {
      el.innerHTML = tcBaseSnapshot;
    } else {
      el.querySelectorAll('.tc-actions').forEach(a => a.remove());
      el.querySelectorAll('ins.tc-ins').forEach(i => i.remove());
      el.querySelectorAll('del.tc-del').forEach(d => d.replaceWith(...d.childNodes));
      el.normalize();
    }
    setTrackChanges(false);
    setTCBaseSnapshot('');
    ed.pushHistory(el.innerHTML);
    scheduleSave();
    updatePageCount();
  }, [ed, scheduleSave, tcBaseSnapshot, updatePageCount]);

  const toggleTrackChanges = useCallback(() => {
    const editor = ed.editorRef.current;
    if (!editor) return;
    if (!trackChanges) {
      setTCBaseSnapshot(editor.innerHTML);
      setTrackChanges(true);
      return;
    }
    setTrackChanges(false);
  }, [ed.editorRef, trackChanges]);

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'f') { e.preventDefault(); setShowFindReplace(true); }
        if (e.key === 's') { e.preventDefault(); save(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save]);

  useEffect(() => {
    const handler = (e) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault(); e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveStatus]);

  const applyFont = (font) => {
    setFontFamily(font);
    if (trackChanges) {
      document.execCommand('fontName', false, font);
      scheduleSave();
    } else {
      ed.exec('fontName', font);
    }
    updateSelectionState();
  };

  const applySize = (size) => {
    const pt = String(size);
    setFontSize(pt);

    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement('span');
    span.style.fontSize = `${pt}pt`;

    try {
      range.surroundContents(span);
    } catch {
      document.execCommand('fontSize', false, '7');
      ed.editorRef.current?.querySelectorAll('font[size="7"]').forEach(el => {
        el.removeAttribute('size');
        el.style.fontSize = `${pt}pt`;
      });
    }

    if (!trackChanges) {
      handleInput();
    } else {
      scheduleSave();
    }
    updateSelectionState();
  };
  const applyTextColor = (c) => {
    setTextColor(c);
    if (trackChanges) {
      document.execCommand('foreColor', false, c);
      scheduleSave();
    } else {
      ed.exec('foreColor', c);
    }
  };
  const applyHighlight = (c) => {
    setHighlightColor(c);
    if (trackChanges) {
      document.execCommand('hiliteColor', false, c);
      scheduleSave();
    } else {
      ed.exec('hiliteColor', c);
    }
  };

  const applyLineSpacing = useCallback((value) => {
    setLineSpacing(value);
    document.execCommand('styleWithCSS', false, true);
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;

    const range = sel.getRangeAt(0);
    let node = range.commonAncestorContainer;
    if (node.nodeType !== 1) node = node.parentNode;

    while (node && !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'LI'].includes(node.nodeName)) {
      node = node.parentNode;
    }

    if (node) {
      node.style.lineHeight = value;
      if (!trackChanges) {
        ed.pushHistory(ed.getHTML());
      }
      scheduleSave();
    }
  }, [trackChanges, ed, scheduleSave]);

  const insertCaption = useCallback(() => {
    const captionText = window.prompt('Caption text');
    const trimmed = String(captionText || '').trim();
    if (!trimmed) return;
    ed.restoreRange();
    ed.insertHTML(`<p style="text-align:center; font-style:italic; color:#6b7280;">${trimmed}</p>`);
    scheduleSave();
  }, [ed, scheduleSave]);

  const applyFontTheme = useCallback((themeKey) => {
    const theme = FONT_THEME_PRESETS[themeKey] || FONT_THEME_PRESETS.default;
    setFontTheme(themeKey);
    setFontFamily(theme.family);
  }, []);

  const applyColorTheme = useCallback((themeKey) => {
    const theme = COLOR_THEME_PRESETS[themeKey] || COLOR_THEME_PRESETS.default;
    setColorTheme(themeKey);
    setPageColor(theme.page);
    setPageTextColor(theme.text);
  }, []);

  const markFormattingSelection = useCallback(() => {
    if (!trackChanges) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    const ins = document.createElement('ins');
    ensureTrackChangeMeta(ins, 'tc-ins', 'formatted');

    try {
      const frag = range.extractContents();
      ins.appendChild(frag);
      range.insertNode(ins);
      sel.removeAllRanges();
      const nr = document.createRange();
      nr.selectNodeContents(ins);
      sel.addRange(nr);
    } catch {
      // Best-effort marker for complex selections.
    }
  }, [trackChanges, ensureTrackChangeMeta]);

  const handleEditorKeyDown = useCallback((e) => {
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      const editor = ed.editorRef.current;
      const text = editor?.innerText?.slice(-500) || '';
      if (!text.trim()) return;
      aiAutocomplete(text).then(result => {
        if (!result) return;
        editor.focus();
        document.execCommand('insertText', false, ` ${result}`);
        scheduleSave();
        commitDomMutation();
      }).catch(() => {});
      return;
    }
    if (trackChanges && (e.ctrlKey || e.metaKey) && ['z', 'y'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      return;
    }
    ed.handleKeyDown(e);
  }, [trackChanges, ed, scheduleSave, commitDomMutation]);

  const handleEditorMouseUp = useCallback(() => {
    updateSelectionState();
    if (!formatPainterActive || !copiedFormat) return;
    document.execCommand('styleWithCSS', false, true);
    if (copiedFormat.bold) document.execCommand('bold', false, null);
    if (copiedFormat.italic) document.execCommand('italic', false, null);
    if (copiedFormat.underline) document.execCommand('underline', false, null);
    if (copiedFormat.fontName) document.execCommand('fontName', false, copiedFormat.fontName);
    if (copiedFormat.foreColor) document.execCommand('foreColor', false, copiedFormat.foreColor);
    setFormatPainterActive(false);
    setCopiedFormat(null);
    if (ed.editorRef.current) ed.editorRef.current.style.cursor = 'text';
    commitDomMutation();
  }, [updateSelectionState, formatPainterActive, copiedFormat, ed.editorRef, commitDomMutation]);

  useEffect(() => {
    const closeMenu = () => {
      setTableMenu(prev => ({ ...prev, visible: false }));
      setSpellMenu(prev => ({ ...prev, visible: false }));
    };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    const editor = ed.editorRef.current;
    if (!editor) return;

    const ensureHandles = () => {
      editor.querySelectorAll('td, th').forEach((cell) => {
        if (!cell.querySelector('.col-resize-handle')) {
          const handle = document.createElement('div');
          handle.className = 'col-resize-handle';
          handle.contentEditable = 'false';
          cell.appendChild(handle);
        }
      });
    };

    ensureHandles();
    const observer = new MutationObserver(() => ensureHandles());
    observer.observe(editor, { childList: true, subtree: true });

    let dragState = null;
    const onMouseDown = (e) => {
      const handle = e.target.closest('.col-resize-handle');
      if (!handle) return;
      e.preventDefault();
      const cell = handle.parentElement;
      const startX = e.clientX;
      const startW = cell.getBoundingClientRect().width;
      dragState = { cell, startX, startW };
    };

    const onMouseMove = (e) => {
      if (!dragState) return;
      const width = Math.max(30, dragState.startW + (e.clientX - dragState.startX));
      dragState.cell.style.width = `${width}px`;
    };

    const onMouseUp = () => {
      if (!dragState) return;
      dragState = null;
      commitDomMutation();
      ensureHandles();
    };

    editor.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      observer.disconnect();
      editor.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [ed.editorRef, commitDomMutation]);

  const handleInsertLink = useCallback((url, text, newTab) => {
    const normalizedUrl = String(url || '').trim();
    if (!normalizedUrl) return;
    const safeUrl = /^https?:\/\//i.test(normalizedUrl) ? normalizedUrl : `https://${normalizedUrl}`;
    ed.restoreRange();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      ed.exec('createLink', safeUrl);
      if (newTab) setTimeout(() => {
        ed.editorRef.current?.querySelectorAll('a').forEach((a) => {
          if (a.getAttribute('href') === safeUrl) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
          }
        });
      }, 0);
    } else {
      ed.insertHTML(`<a href="${safeUrl}"${newTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text || safeUrl}</a>`);
    }
    scheduleSave();
  }, [ed, scheduleSave]);

  const handleExportDocx = async () => {
    await save();
    try { await exportDocx(docId, title); }
    catch { setError('Export failed — ensure html-to-docx is installed (npm install in /server).'); }
  };
  const handleExportPdf = async () => {
    await save();
    try {
      await exportPdf(docId, title);
    } catch {
      setError('PDF export failed — ensure puppeteer is installed (npm install in /server).');
    }
  };
  const handleExportHTML = () => {
    const b = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Calibri,sans-serif;max-width:794px;margin:0 auto;padding:48px}</style></head><body>${ed.getHTML()}</body></html>`], { type: 'text/html' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(b), download: `${title || 'document'}.html` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  const handleExportTxt = () => {
    const b = new Blob([ed.editorRef.current?.innerText || ''], { type: 'text/plain' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(b), download: `${title || 'document'}.txt` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  const handleImportDocx = () => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.docx' });
    inp.onchange = async (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      try { const { data } = await importDocx(docId, file); ed.setHTML(data.content); scheduleSave(); }
      catch { setError('Import failed — ensure mammoth is installed (npm install in /server).'); }
    };
    inp.click();
  };
  const handleImportTxt = () => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.txt' });
    inp.onchange = (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { ed.setHTML(`<p>${(ev.target.result||'').replace(/\n/g,'</p><p>')}</p>`); scheduleSave(); };
      reader.readAsText(file);
    };
    inp.click();
  };

  const dims  = PAGE_DIMS[pageSize]   || PAGE_DIMS.A4;
  const marg = margins === 'custom' && customMargins
    ? {
      t: cmToPx(customMargins.top),
      r: cmToPx(customMargins.right),
      b: cmToPx(customMargins.bottom),
      l: cmToPx(customMargins.left),
    }
    : (MARGIN_VALS[margins] || MARGIN_VALS.normal);
  const marginCss = margins === 'custom' && customMargins
    ? customMargins
    : (PRESET_MARGIN_CM[margins] || PRESET_MARGIN_CM.normal);
  const scaledW = dims.width * zoom / 100;
  const activeColorTheme = COLOR_THEME_PRESETS[colorTheme] || COLOR_THEME_PRESETS.default;
  const workspaceColor = darkMode ? '#505050' : activeColorTheme.canvas;

  const SS_MAP = {
    saved:   { text: 'Saved ✓',      color: 'rgba(255,255,255,0.6)' },
    saving:  { text: 'Saving…',      color: 'rgba(255,255,255,0.6)' },
    unsaved: { text: '● Unsaved',    color: '#fcd34d' },
    error:   { text: '⚠ Save error', color: '#fca5a5' },
  };
  const ss = SS_MAP[saveStatus] || SS_MAP.saved;

  useEffect(() => {
    updateSelectionState();
  }, [updateSelectionState, doc]);

  useEffect(() => {
    updatePageCount();
  }, [pageSize, margins, customMargins, lineSpacing, updatePageCount]);

  useEffect(() => {
    ed.setOnHistoryRestore(() => {
      checkOrphanedComments();
      updatePageCount();
    });
    return () => ed.setOnHistoryRestore(null);
  }, [ed, checkOrphanedComments, updatePageCount]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const pageEl = ed.editorRef.current?.parentElement;
      const contentEl = ed.editorRef.current;
      if (!pageEl || !contentEl) return;
      setContentOverflows(contentEl.scrollHeight > pageEl.clientHeight);
      updatePageCount();
    });
    if (ed.editorRef.current) observer.observe(ed.editorRef.current);
    return () => observer.disconnect();
  }, [ed.editorRef, updatePageCount]);

  useEffect(() => {
    const nodes = [];
    if (headerRef.current) nodes.push(...headerRef.current.querySelectorAll('.page-num-field'));
    if (footerRef.current) nodes.push(...footerRef.current.querySelectorAll('.page-num-field'));
    nodes.forEach(node => {
      node.textContent = String(currentPage);
    });
  }, [currentPage, headerContent, footerContent]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0e0e0f', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 32, height: 32, border: '2px solid #222', borderTopColor: '#e8b429', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontFamily: 'Fira Code, monospace', fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: 2 }}>Loading document</span>
    </div>
  );

  const ribbonProps = {
    activeTab, onTabChange: setActiveTab,
    fontFamily: selectionState.fontFamily || fontFamily,
    fontSize: selectionState.fontSize || fontSize,
    textColor, highlightColor, selectionState,
    namedStyles: NAMED_STYLES,
    formatPainterActive,
    canUndo: ed.canUndo, canRedo: ed.canRedo,
    trackChanges, pageSize, margins, lineSpacing,
    showPageNumbers, showRuler, zoom, darkMode, focusMode,
    drawMode, pageColor, watermarkText, pageBorder, fontTheme, colorTheme,
    showComments, showVersionHistory,
    onExec: (cmd, value) => {
      const isFormatting = FORMATTING_COMMANDS.has(cmd);
      if (trackChanges && isFormatting) markFormattingSelection();
      if (trackChanges) {
        document.execCommand(cmd, false, value ?? null);
        decorateTrackChangeNodes();
        scheduleSave();
      } else {
        ed.exec(cmd, value);
      }
      updateSelectionState();
    },
    onApplyHeading: (tag) => {
      if (trackChanges) {
        markFormattingSelection();
        document.execCommand('formatBlock', false, tag === 'p' || tag === 'normal' ? 'p' : tag);
        decorateTrackChangeNodes();
        scheduleSave();
      } else {
        ed.applyHeading(tag);
      }
      updateSelectionState();
    },
    onSetFontFamily: applyFont, onSetFontSize: applySize,
    onApplyStyle: applyNamedStyle,
    onActivateFormatPainter: activateFormatPainter,
    onSetTextColor: applyTextColor, onSetHighlight: applyHighlight,
    onUndo: () => {
      if (trackChanges) return;
      ed.undo();
      checkOrphanedComments();
    },
    onRedo: () => {
      if (trackChanges) return;
      ed.redo();
      checkOrphanedComments();
    },
    onShowTable:       () => { ed.saveRange(); setShowTableDialog(true); },
    onShowImage:       () => { ed.saveRange(); setShowImageDialog(true); },
    onShowLink:        () => { ed.saveRange(); setShowLinkDialog(true); },
    onInsertHR:        () => { ed.restoreRange(); ed.insertHR();        scheduleSave(); },
    onInsertPageBreak: () => { ed.restoreRange(); ed.insertPageBreak(); scheduleSave(); },
    onInsertFootnote:  () => { ed.restoreRange(); ed.insertFootnote();  scheduleSave(); },
    onInsertTOC:       () => { ed.restoreRange(); ed.insertTOC();       scheduleSave(); },
    onShowSymbols:     () => { ed.saveRange(); setShowSymbolPicker(true); },
    onSetPageSize:  v => { setPageSize(v); setTimeout(save, 100); },
    onSetMargins:   v => { setMargins(v); setCustomMargins(null); setTimeout(save, 100); },
    onSetLineSpacing: applyLineSpacing,
    onInsertCaption: insertCaption,
    onToggleDrawMode: () => setDrawMode(v => !v),
    onSetPageColor: setPageColor,
    onSetWatermarkText: setWatermarkText,
    onTogglePageBorder: () => setPageBorder(v => !v),
    onApplyFontTheme: applyFontTheme,
    onApplyColorTheme: applyColorTheme,
    onTogglePageNumbers: () => setShowPageNumbers(p => !p),
    onToggleTrackChanges: toggleTrackChanges,
    onAcceptAll: acceptAllChanges, onRejectAll: rejectAllChanges,
    onShowWordCount:      () => setShowWordCount(true),
    onShowComments:       () => setShowComments(c => !c),
    onShowVersionHistory: () => setShowVersionHistory(v => !v),
    onToggleRuler:  () => setShowRuler(r => !r),
    onSetZoom: setZoom,
    onToggleDarkMode:  () => setDarkMode(d => !d),
    onToggleFocusMode: () => setFocusMode(f => !f),
    onShowFindReplace: () => setShowFindReplace(true),
    onExportDocx: handleExportDocx, onExportHTML: handleExportHTML,
    onExportPdf: handleExportPdf,
    onExportTxt:  handleExportTxt,  onPrint: () => window.print(),
    onToggleHeaderFooter: () => setShowHeaderFooter(v => !v),
    onInsertPageNumber: () => {
      if (editingHeader || editingFooter) {
        document.execCommand('insertHTML', false, `<span class="page-num-field">${currentPage}</span>`);
      }
    },
    onImportDocx: handleImportDocx, onImportTxt: handleImportTxt,
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: darkMode ? '#404040' : undefined }}>

      {/* App bar */}
      {!focusMode && (
        <div className="no-print" style={{
          background: '#0e0e0f',
          borderBottom: '1px solid #1e1e20',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
          minHeight: 44,
          fontFamily: 'Fira Code, monospace',
        }}>
          {/* Brand mark */}
          <div style={{ width: 28, height: 28, background: '#e8b429', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#0e0e0f', clipPath: 'polygon(0 0, 100% 0, 100% 75%, 82% 100%, 0 100%)', flexShrink: 0 }}>W</div>

          <button
            onClick={async () => { await save(); navigate('/'); }}
            style={{ color: '#555', fontSize: 10, fontFamily: 'Fira Code, monospace', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 1.5, transition: 'color 0.12s', flexShrink: 0 }}
            onMouseEnter={e => e.target.style.color = '#f5f2eb'}
            onMouseLeave={e => e.target.style.color = '#555'}
          >
            ← Docs
          </button>

          <div style={{ width: 1, height: 20, background: '#222', flexShrink: 0 }} />

          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => save()}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              color: '#f5f2eb',
              fontFamily: 'Fira Code, monospace',
              fontSize: 13,
              fontWeight: 400,
              border: 'none',
              borderBottom: '1px solid #333',
              outline: 'none',
              padding: '2px 0',
              letterSpacing: 0.3,
            }}
            onFocus={e => e.target.style.borderBottomColor = '#e8b429'}
            onBlurCapture={e => e.target.style.borderBottomColor = '#333'}
            placeholder="Document title"
          />

          <span style={{
            fontSize: 9,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            fontFamily: 'Fira Code, monospace',
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            color: saveStatus === 'unsaved' ? '#e8b429' : saveStatus === 'error' ? '#fca5a5' : '#444',
          }}>
            {ss.text}
          </span>

          {onlineUsers.length > 0 && (
            <div style={{ display: 'flex', marginLeft: -4, flexShrink: 0 }}>
              {onlineUsers.slice(0, 5).map(u => (
                <div key={u.socketId}
                  style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #0e0e0f', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, marginLeft: -4 }}
                  title={u.userName}>
                  {(u.userName || '?')[0].toUpperCase()}
                </div>
              ))}
              {onlineUsers.length > 5 && (
                <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #0e0e0f', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 9, marginLeft: -4 }}>+{onlineUsers.length - 5}</div>
              )}
            </div>
          )}

          <button
            onClick={() => { ed.saveRange(); setShowShareModal(true); }}
            style={{ flexShrink: 0, fontSize: 9, padding: '5px 12px', background: 'transparent', border: '1px solid #333', color: '#888', fontFamily: 'Fira Code, monospace', cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 1.5, transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#f5f2eb'; e.currentTarget.style.color = '#f5f2eb'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}
          >
            Share
          </button>

          <button
            onClick={() => setShowAIPanel(p => !p)}
            style={{ flexShrink: 0, fontSize: 9, padding: '5px 12px', background: showAIPanel ? '#e8b429' : 'transparent', border: `1px solid ${showAIPanel ? '#e8b429' : '#444'}`, color: showAIPanel ? '#0e0e0f' : '#e8b429', fontFamily: 'Fira Code, monospace', cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 1.5, transition: 'all 0.12s' }}
          >
            ✦ AI
          </button>

          <div
            style={{ width: 28, height: 28, borderRadius: '50%', background: '#e8b429', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0e0e0f', fontSize: 12, fontWeight: 700, flexShrink: 0, cursor: 'default' }}
            title={user?.name}
          >
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        </div>
      )}

      {/* Ribbon */}
      {!focusMode && <Ribbon {...ribbonProps} />}

      {/* Ruler */}
      {!focusMode && showRuler && (
        <div className="no-print flex justify-center bg-[#606060] overflow-x-hidden flex-shrink-0" style={{ background: darkMode ? '#333' : workspaceColor }}>
          <div style={{ width: scaledW, transition: 'width 0.15s' }}>
            <Ruler
              pageWidth={dims.width}
              marginLeft={marg.l}
              marginRight={marg.r}
              onMarginChange={({ left, right }) => {
                setMargins('custom');
                setCustomMargins(prev => ({
                  top: prev?.top || pxToCm(marg.t),
                  bottom: prev?.bottom || pxToCm(marg.b),
                  left: pxToCm(Math.max(0, Math.min(left, dims.width - 120))),
                  right: pxToCm(Math.max(0, Math.min(right, dims.width - 120))),
                }));
              }}
            />
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && !focusMode && (
        <div className="no-print" style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', borderLeft: '3px solid #ef4444', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, fontFamily: 'Fira Code, monospace', fontSize: 11, color: '#fca5a5' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}

      {/* Canvas + panels */}
      <div className="flex flex-1 overflow-hidden">
        <div ref={editorContainerRef} onScroll={handleScroll} className="flex-1 overflow-auto canvas-scroll" style={{ background: workspaceColor }}>
          <div className="editor-pages-container">
            {showHeaderFooter && (
              <div
                ref={headerRef}
                className="doc-header"
                contentEditable
                suppressContentEditableWarning
                onFocus={() => setEditingHeader(true)}
                onBlur={(e) => {
                  const clean = DOMPurify.sanitize(e.currentTarget.innerHTML, SANITIZE_HTML_OPTIONS);
                  setHeaderContent(clean);
                  setEditingHeader(false);
                  scheduleSave();
                }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(headerContent, SANITIZE_HTML_OPTIONS) }}
                placeholder="Header"
              />
            )}

            <div className={`editor-page ${pageClass} ${darkMode ? 'editor-dark' : ''}`} style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              fontFamily,
              fontSize: `${fontSize}pt`,
              padding: `${marginCss.top} ${marginCss.right} ${marginCss.bottom} ${marginCss.left}`,
              backgroundColor: pageColor,
              color: pageTextColor,
              border: pageBorder ? '1px solid rgba(148, 163, 184, 0.9)' : '1px solid transparent',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {watermarkText.trim() && (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  <span
                    style={{
                      transform: 'rotate(-32deg)',
                      fontSize: '54px',
                      fontWeight: 700,
                      letterSpacing: '0.28em',
                      textTransform: 'uppercase',
                      opacity: 0.08,
                      color: pageTextColor,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {watermarkText}
                  </span>
                </div>
              )}
              {showPageNumbers && <div className="page-num-top" style={{ position: 'relative', zIndex: 1 }}><span>{currentPage} of {pageCount}</span></div>}
              <div
                ref={ed.editorRef}
                contentEditable spellCheck suppressContentEditableWarning
                onInput={handleInput}
                onKeyDown={handleEditorKeyDown}
                onKeyUp={updateSelectionState}
                onMouseUp={handleEditorMouseUp}
                onClick={handleCellClick}
                onSelect={updateSelectionState}
                onContextMenu={handleEditorContextMenu}
                onPaste={ed.handlePaste}
                style={{
                  minHeight: '100%',
                  outline: 'none',
                  wordBreak: 'break-word',
                  color: pageTextColor,
                  position: 'relative',
                  zIndex: 1,
                  cursor: drawMode || formatPainterActive ? 'crosshair' : 'text',
                }}
              />
              <AIToolbar
                editorRef={ed.editorRef}
                onReplace={handleAIReplace}
                onInsertAfter={handleAIInsert}
              />
              {showPageNumbers && <div className="page-num-bottom" style={{ position: 'relative', zIndex: 1 }}><span>{currentPage} of {pageCount}</span></div>}
            </div>

            {contentOverflows && (
              <div className="page-overflow-indicator">
                -- Page 2 would start here (full pagination coming soon) --
              </div>
            )}

            {showHeaderFooter && (
              <div
                ref={footerRef}
                className="doc-footer"
                contentEditable
                suppressContentEditableWarning
                onFocus={() => setEditingFooter(true)}
                onBlur={(e) => {
                  const clean = DOMPurify.sanitize(e.currentTarget.innerHTML, SANITIZE_HTML_OPTIONS);
                  setFooterContent(clean);
                  setEditingFooter(false);
                  scheduleSave();
                }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(footerContent, SANITIZE_HTML_OPTIONS) }}
                placeholder="Footer"
              />
            )}
          </div>
        </div>

        {showVersionHistory && (
          <div className="no-print w-80 flex-shrink-0 overflow-hidden border-l border-gray-300">
            <VersionHistoryPanel docId={docId}
              onRestore={(content, newTitle) => { ed.setHTML(content); if (newTitle) setTitle(newTitle); scheduleSave(); }}
              onClose={() => setShowVersionHistory(false)}
            />
          </div>
        )}

        {showComments && (
          <div className="no-print w-72 flex-shrink-0 overflow-hidden border-l border-gray-300">
            <CommentsPanel
              docId={docId}
              editorRef={ed.editorRef}
              user={user}
              collaborators={[
                ...(doc?.owner ? [doc.owner] : []),
                ...((doc?.collaborators || []).map(c => c.user).filter(Boolean)),
              ]}
              orphanedCommentIds={orphanedCommentIds}
              onCommentsChange={setDocComments}
              onReanchor={(commentId, anchorId) => {
                setDocComments(prev => prev.map(c => (c._id === commentId ? { ...c, anchorId } : c)));
                setOrphanedCommentIds(prev => prev.filter(id => id !== commentId));
              }}
              onClose={() => setShowComments(false)}
            />
          </div>
        )}

        {showAIPanel && (
          <div className="no-print w-80 flex-shrink-0 overflow-hidden border-l border-gray-300 flex flex-col">
            <AIChatPanel
              editorRef={ed.editorRef}
              onInsertContent={handleAIInsert}
              onClose={() => setShowAIPanel(false)}
            />
          </div>
        )}
      </div>

      {Object.entries(collaboratorCursors).map(([userId, { userName, color, position }]) => {
        if (!position) return null;
        return (
          <div key={userId} style={{
            position: 'fixed', left: position.x, top: position.y,
            width: 2, height: 20, backgroundColor: color || '#2b579a', pointerEvents: 'none', zIndex: 50,
          }}>
            <span style={{
              position: 'absolute', top: -20, left: 4,
              background: color || '#2b579a', color: '#fff',
              fontSize: 11, padding: '1px 4px', borderRadius: 3, whiteSpace: 'nowrap',
            }}>{userName || 'User'}</span>
          </div>
        );
      })}

      {tableMenu.visible && (
        <div
          className="table-context-menu"
          style={{ position: 'fixed', top: tableMenu.y, left: tableMenu.x, zIndex: 100 }}
          onMouseLeave={() => setTableMenu(prev => ({ ...prev, visible: false }))}
        >
          <button onClick={() => insertRowAbove(tableMenu.cell)}>Insert Row Above</button>
          <button onClick={() => insertRowBelow(tableMenu.cell)}>Insert Row Below</button>
          <button onClick={() => insertColLeft(tableMenu.cell)}>Insert Column Left</button>
          <button onClick={() => insertColRight(tableMenu.cell)}>Insert Column Right</button>
          <hr />
          <button onClick={() => deleteRow(tableMenu.cell)}>Delete Row</button>
          <button onClick={() => deleteCol(tableMenu.cell)}>Delete Column</button>
          <button onClick={() => deleteTable(tableMenu.cell)}>Delete Table</button>
          <hr />
          <button onClick={() => mergeCells(tableMenu.cell)}>Merge Selected Cells</button>
          <button onClick={() => splitCell(tableMenu.cell)}>Split Cell</button>
        </div>
      )}

      {spellMenu.visible && (
        <div
          className="spell-context-menu"
          style={{ position: 'fixed', top: spellMenu.y, left: spellMenu.x, zIndex: 110 }}
          onClick={(e) => e.stopPropagation()}
        >
          {spellMenu.suggestions.length > 0 ? spellMenu.suggestions.map((suggestion) => (
            <button key={suggestion} onClick={() => replaceMisspelledWord(suggestion)}>
              {suggestion}
            </button>
          )) : <div className="spell-context-empty">No suggestions</div>}
          <hr />
          <button onClick={() => ignoreWord(spellMenu.word)}>Ignore "{spellMenu.word}"</button>
        </div>
      )}

      {/* Status bar */}
      {!focusMode && (
        <div className="no-print" style={{ background: '#0e0e0f', borderTop: '1px solid #1e1e20', padding: '4px 16px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, fontFamily: 'Fira Code, monospace', fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 1, userSelect: 'none' }}>
          {(() => { const w = ed.getWordCount(); return <><span>{w.words} words</span><span>{w.chars} chars</span></>; })()}
          <span>{pageSize}</span>
          <span>{zoom}%</span>
          {trackChanges && <span style={{ color: '#e8b429' }}>Track Changes</span>}
          <span style={{ marginLeft: 'auto', color: saveStatus === 'unsaved' ? '#e8b429' : saveStatus === 'error' ? '#fca5a5' : '#333' }}>{ss.text}</span>
        </div>
      )}

      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          style={{ position: 'fixed', top: 16, right: 16, zIndex: 50, padding: '6px 14px', background: '#0e0e0f', color: '#e8b429', border: '1px solid #333', fontFamily: 'Fira Code, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, cursor: 'pointer' }}
        >
          Exit Focus
        </button>
      )}

      {/* Modals */}
      {showFindReplace && <FindReplaceModal editorRef={ed.editorRef} onClose={() => setShowFindReplace(false)} />}
      {showTableDialog  && <TableDialog onInsert={(r,c) => { ed.restoreRange(); ed.insertTable(r,c); scheduleSave(); }} onClose={() => setShowTableDialog(false)} />}
      {showImageDialog  && <ImageDialog onInsert={(src,alt) => { ed.insertImage(src,alt); scheduleSave(); }} onClose={() => setShowImageDialog(false)} />}
      {showSymbolPicker && <SymbolPicker onInsert={(sym) => { ed.restoreRange(); ed.insertHTML(sym); scheduleSave(); setShowSymbolPicker(false); }} onClose={() => setShowSymbolPicker(false)} />}
      {showLinkDialog   && <LinkDialog editorRef={ed.editorRef} savedRangeRef={ed.savedRangeRef} onInsert={handleInsertLink} onClose={() => setShowLinkDialog(false)} />}
      {showWordCount    && <WordCountModal stats={ed.getWordCount()} onClose={() => setShowWordCount(false)} />}
      {showShareModal && doc && <ShareModal doc={doc} onClose={() => setShowShareModal(false)} onDocUpdate={u => setDoc(d => ({ ...d, ...u }))} />}
    </div>
  );
}
