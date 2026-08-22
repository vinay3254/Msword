const router   = require('express').Router();
const multer   = require('multer');
const Document = require('../models/Document');
const auth     = require('../middleware/auth');

const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const hasAccess = (doc, userId) =>
  String(doc.owner) === String(userId) ||
  doc.collaborators.some(c => String(c.user) === String(userId));

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

    res.json({ _id: doc._id, content: doc.content, lastModified: doc.lastModified });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to import document' });
  }
});

module.exports = router;
