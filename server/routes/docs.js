const router   = require('express').Router();
const { body, validationResult } = require('express-validator');
const Document = require('../models/Document');
const auth     = require('../middleware/auth');

// All routes in this file require authentication
router.use(auth);

// Shared query: documents owned by OR shared with the current user
const userDocsQuery = (userId) => ({
  $or: [{ owner: userId }, { collaborators: userId }],
});

// ── GET /api/docs ─────────────────────────────────────────────────────────
// Returns all documents for the logged-in user (title + metadata only)
router.get('/', async (req, res) => {
  try {
    const docs = await Document.find(userDocsQuery(req.user._id))
      .select('title lastModified createdAt owner')
      .sort({ lastModified: -1 });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// ── POST /api/docs ────────────────────────────────────────────────────────
// Create a new document
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
// Get a single document (owner or collaborator)
router.get('/:id', async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      ...userDocsQuery(req.user._id),
    });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json(doc);
  } catch (err) {
    // Invalid ObjectId format
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch document' });
  }
});

// ── PUT /api/docs/:id ─────────────────────────────────────────────────────
// Update title and/or content (owner or collaborator); auto-save endpoint
router.put(
  '/:id',
  [
    body('title').optional().trim().isLength({ max: 200 }),
    body('content').optional(),
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

      if (req.body.title   !== undefined) doc.title   = req.body.title;
      if (req.body.content !== undefined) doc.content = req.body.content;
      // lastModified updated by pre-save hook

      await doc.save();
      // Return lean response for auto-save performance
      res.json({ _id: doc._id, title: doc.title, lastModified: doc.lastModified });
    } catch (err) {
      if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
      console.error(err);
      res.status(500).json({ message: 'Failed to save document' });
    }
  }
);

// ── DELETE /api/docs/:id ──────────────────────────────────────────────────
// Delete a document (owner only)
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({
      _id:   req.params.id,
      owner: req.user._id,   // only the owner can delete
    });
    if (!doc) return res.status(404).json({ message: 'Document not found or you are not the owner' });
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

module.exports = router;
