const router   = require('express').Router();
const multer   = require('multer');
const sanitizeHtml = require('sanitize-html');
const Document = require('../models/Document');
const auth     = require('../middleware/auth');

const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const sanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'span', 'div', 'p',
    'table', 'thead', 'tbody', 'tr', 'td', 'th', 'colgroup', 'col',
    'ins', 'del', 'sup', 'sub', 'hr', 'br', 'figure', 'figcaption',
  ]),
  allowedAttributes: {
    '*': ['style', 'class', 'id', 'data-*'],
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'data'],
};

let browserInstance = null;
const getBrowser = async () => {
  if (!browserInstance || !browserInstance.isConnected()) {
    const puppeteer = require('puppeteer');
    browserInstance = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  }
  return browserInstance;
};

const hasAccess = (doc, userId) =>
  String(doc.owner) === String(userId) ||
  doc.collaborators.some(c => String(c.user) === String(userId));

const PRESET_MARGINS = {
  normal: { top: '2.54cm', right: '2.54cm', bottom: '2.54cm', left: '2.54cm' },
  narrow: { top: '1.27cm', right: '1.27cm', bottom: '1.27cm', left: '1.27cm' },
  wide:   { top: '2.54cm', right: '5.08cm', bottom: '2.54cm', left: '5.08cm' },
};

function resolveMargins(doc) {
  if (doc.margins === 'custom' && doc.customMargins?.top) {
    return {
      top: doc.customMargins.top || '2.54cm',
      right: doc.customMargins.right || '2.54cm',
      bottom: doc.customMargins.bottom || '2.54cm',
      left: doc.customMargins.left || '2.54cm',
    };
  }
  return PRESET_MARGINS[doc.margins] || PRESET_MARGINS.normal;
}

// ── GET /api/export/:docId/docx ───────────────────────────────────────────
router.get('/:docId/docx', auth, async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.docId,
      $or: [{ owner: req.user._id }, { 'collaborators.user': req.user._id }],
    });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    let HTMLtoDOCX;
    try {
      HTMLtoDOCX = require('html-to-docx');
    } catch {
      return res.status(501).json({ message: 'html-to-docx package not installed. Run: npm install html-to-docx' });
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.title}</title></head><body>${doc.content || '<p></p>'}</body></html>`;
    const buffer = await HTMLtoDOCX(html, null, {
      title:   doc.title,
      creator: 'MSWord Clone',
      table:   { row: { cantSplit: true } },
    });

    const safeName = doc.title.replace(/[^\w\s-]/g, '').trim() || 'document';
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${safeName}.docx"`,
    });
    res.send(buffer);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to export document' });
  }
});

// ── GET /api/export/:docId/pdf ────────────────────────────────────────────
router.get('/:docId/pdf', auth, async (req, res) => {
  let page;
  try {
    const doc = await Document.findById(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (!hasAccess(doc, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    let browser;
    try {
      browser = await getBrowser();
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND' && !String(err.message || '').includes("Cannot find module 'puppeteer'")) {
        throw err;
      }
      return res.status(501).json({ message: 'puppeteer package not installed. Run: npm install puppeteer' });
    }

    const margins = resolveMargins(doc);
    const headerHTML = doc.headerContent || '';
    const footerHTML = doc.footerContent || '';

    page = await browser.newPage();

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <style>
            body {
              font-family: Calibri, sans-serif;
              font-size: 11pt;
              margin: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left};
              line-height: 1.15;
            }
            .doc-header { border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 16px; color: #64748b; font-size: 10pt; }
            .doc-footer { border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 16px; color: #64748b; font-size: 10pt; }
            .tc-ins { color: #16a34a; text-decoration: underline; }
            .tc-del { color: #ef4444; text-decoration: line-through; }
            .comment-anchor { background: #fef9c3; }
            img { max-width: 100%; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${headerHTML ? `<div class="doc-header">${sanitizeHtml(headerHTML || '', sanitizeOptions)}</div>` : ''}
          ${sanitizeHtml(doc.content || '<p></p>', sanitizeOptions)}
          ${footerHTML ? `<div class="doc-footer">${sanitizeHtml(footerHTML || '', sanitizeOptions)}</div>` : ''}
        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: doc.pageSize || 'A4',
      printBackground: true,
      margin: margins,
    });

    const safeName = (doc.title || 'document').replace(/[^\w\s-]/g, '').trim() || 'document';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ message: 'PDF export failed' });
  } finally {
    await page?.close();
  }
});

// ── POST /api/export/:docId/import-docx ──────────────────────────────────
router.post('/:docId/import-docx', auth, memUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const doc = await Document.findOne({
      _id: req.params.docId,
      $or: [{ owner: req.user._id }, { 'collaborators.user': req.user._id }],
    });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    let mammoth;
    try {
      mammoth = require('mammoth');
    } catch {
      return res.status(501).json({ message: 'mammoth package not installed. Run: npm install mammoth' });
    }

    const result = await mammoth.convertToHtml({ buffer: req.file.buffer });
    doc.content = result.value;
    await doc.save();

    res.json({ _id: doc._id, content: doc.content, updatedAt: doc.updatedAt });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to import document' });
  }
});

module.exports = router;
