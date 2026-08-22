const router   = require('express').Router();
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
    const filter = search
      ? { ...base, title: { $regex: search, $options: 'i' } }
      : base;

    const docs = await Document.find(filter)
      .select('title lastModified createdAt owner collaborators shareToken sharePermission')
      .populate('collaborators.user', 'name email')
      .sort({ lastModified: -1 });
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
    body('margins').optional().isIn(['normal', 'narrow', 'wide']),
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

      await doc.save();
      res.json({ _id: doc._id, title: doc.title, lastModified: doc.lastModified });
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
    const doc = await Document.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found or not the owner' });
    // Clean up versions
    await Version.deleteMany({ document: req.params.id });
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

module.exports = router;
