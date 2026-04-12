const router   = require('express').Router();
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { body, validationResult } = require('express-validator');
const Document = require('../models/Document');
const Version  = require('../models/Version');
const auth     = require('../middleware/auth');

router.use(auth);

// Owner OR collaborator (new schema: collaborators is array of {user, permission})
const userDocsQuery = (userId) => ({
  $or: [{ owner: userId }, { 'collaborators.user': userId }],
});

// ── GET /api/docs ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const base = userDocsQuery(req.user._id);
    const filter = { ...base, deleted: { $ne: true } };

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: escapedSearch, $options: 'i' };
    }

    const docs = await Document.find(filter)
      .select('title folder deleted deletedAt updatedAt createdAt owner collaborators shareToken sharePermission')
      .populate('collaborators.user', 'name email')
      .sort({ updatedAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// ── POST /api/docs ────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('title').optional().trim().isLength({ max: 200 }),
    body('content').optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const doc = await Document.create({
        title:   req.body.title   || 'Untitled Document',
        content: req.body.content || '',
        owner:   req.user._id,
      });
      res.status(201).json(doc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to create document' });
    }
  }
);

// ── GET /api/docs/folders ────────────────────────────────────────────────
router.get('/folders', async (req, res) => {
  try {
    const folders = await Document.distinct('folder', {
      ...userDocsQuery(req.user._id),
      deleted: { $ne: true },
    });
    res.json(folders.filter(Boolean));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch folders' });
  }
});

// ── GET /api/docs/trash ──────────────────────────────────────────────────
router.get('/trash', async (req, res) => {
  try {
    const docs = await Document.find({ owner: req.user._id, deleted: true })
      .select('title content folder deleted deletedAt updatedAt createdAt owner collaborators')
      .sort({ deletedAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch trash' });
  }
});

// ── PATCH /api/docs/:id/folder ───────────────────────────────────────────
router.patch('/:id/folder', async (req, res) => {
  try {
    const folder = String(req.body.folder || '').trim();
    if (!folder) return res.status(400).json({ message: 'Folder is required' });

    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, deleted: { $ne: true } },
      { folder },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to move document' });
  }
});

// ── POST /api/docs/:id/restore ───────────────────────────────────────────
router.post('/:id/restore', async (req, res) => {
  try {
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { deleted: false, deletedAt: null },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to restore document' });
  }
});

// ── DELETE /api/docs/:id/permanent ───────────────────────────────────────
router.delete('/:id/permanent', async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, owner: req.user._id, deleted: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    await Version.deleteMany({ document: req.params.id });

    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    const $ = cheerio.load(doc.content || '');
    $('img').each((_, el) => {
      const src = $(el).attr('src') || '';
      const match = src.match(/\/uploads\/(.+)$/);
      if (!match) return;

      const relativePath = match[1].split('?')[0];
      const filePath = path.resolve(uploadsDir, relativePath);
      if (filePath.startsWith(uploadsDir)) {
        fs.unlink(filePath, () => {});
      }
    });

    res.json({ message: 'Permanently deleted' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to permanently delete document' });
  }
});

// ── GET /api/docs/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      ...userDocsQuery(req.user._id),
    }).populate('owner', 'name email').populate('collaborators.user', 'name email');
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json(doc);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch document' });
  }
});

// ── PUT /api/docs/:id ─────────────────────────────────────────────────────
router.put(
  '/:id',
  [
    body('title').optional().trim().isLength({ max: 200 }),
    body('content').optional(),
    body('pageSize').optional().isIn(['A4', 'Letter', 'Legal']),
    body('margins').optional().isIn(['normal', 'narrow', 'wide', 'custom']),
    body('customMargins').optional().isObject(),
    body('headerContent').optional(),
    body('footerContent').optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const doc = await Document.findOne({
        _id: req.params.id,
        ...userDocsQuery(req.user._id),
      });
      if (!doc) return res.status(404).json({ message: 'Document not found' });

      if (req.body.title    !== undefined) doc.title    = req.body.title;
      if (req.body.content  !== undefined) doc.content  = req.body.content;
      if (req.body.pageSize !== undefined) doc.pageSize = req.body.pageSize;
      if (req.body.margins  !== undefined) doc.margins  = req.body.margins;
      if (req.body.customMargins !== undefined) {
        doc.customMargins = {
          top: req.body.customMargins.top || '',
          right: req.body.customMargins.right || '',
          bottom: req.body.customMargins.bottom || '',
          left: req.body.customMargins.left || '',
        };
      }
      if (req.body.headerContent !== undefined) doc.headerContent = req.body.headerContent;
      if (req.body.footerContent !== undefined) doc.footerContent = req.body.footerContent;

      await doc.save();
      res.json({ _id: doc._id, title: doc.title, updatedAt: doc.updatedAt });
    } catch (err) {
      if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
      console.error(err);
      res.status(500).json({ message: 'Failed to save document' });
    }
  }
);

// ── DELETE /api/docs/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { deleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Moved to trash' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

module.exports = router;
