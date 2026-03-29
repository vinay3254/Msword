const router   = require('express').Router();
const Document = require('../models/Document');
const Version  = require('../models/Version');
const auth     = require('../middleware/auth');

router.use(auth);

const hasAccess = (doc, userId) =>
  String(doc.owner) === String(userId) ||
  doc.collaborators.some(c => String(c.user) === String(userId));

// ── GET /api/versions/:docId ──────────────────────────────────────────────
router.get('/:docId', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.docId);
    if (!doc || !hasAccess(doc, req.user._id))
      return res.status(404).json({ message: 'Document not found' });

    const versions = await Version.find({ document: req.params.docId })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('savedBy', 'name')
      .select('-content');  // exclude content from list for performance
    res.json(versions);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch versions' });
  }
});

// ── GET /api/versions/:docId/:versionId ──────────────────────────────────
router.get('/:docId/:versionId', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.docId);
    if (!doc || !hasAccess(doc, req.user._id))
      return res.status(404).json({ message: 'Document not found' });

    const version = await Version.findOne({
      _id:      req.params.versionId,
      document: req.params.docId,
    }).populate('savedBy', 'name');
    if (!version) return res.status(404).json({ message: 'Version not found' });
    res.json(version);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch version' });
  }
});

// ── POST /api/versions/:docId ─────────────────────────────────────────────
// Create a version snapshot (also called automatically on significant saves)
router.post('/:docId', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.docId);
    if (!doc || !hasAccess(doc, req.user._id))
      return res.status(404).json({ message: 'Document not found' });

    const version = await Version.createAndTrim({
      document: doc._id,
      content:  doc.content,
      title:    doc.title,
      savedBy:  req.user._id,
      label:    req.body.label || '',
    });
    res.status(201).json(version);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to save version' });
  }
});

// ── POST /api/versions/:docId/:versionId/restore ─────────────────────────
router.post('/:docId/:versionId/restore', async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.docId,
      $or: [{ owner: req.user._id }, { 'collaborators.user': req.user._id }],
    });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const version = await Version.findOne({ _id: req.params.versionId, document: req.params.docId });
    if (!version) return res.status(404).json({ message: 'Version not found' });

    // Save current state as a version before restoring
    await Version.createAndTrim({
      document: doc._id,
      content:  doc.content,
      title:    doc.title,
      savedBy:  req.user._id,
      label:    'Before restore',
    });

    doc.content = version.content;
    doc.title   = version.title;
    await doc.save();
    res.json({ _id: doc._id, title: doc.title, content: doc.content, lastModified: doc.lastModified });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to restore version' });
  }
});

// ── DELETE /api/versions/:docId/:versionId ────────────────────────────────
router.delete('/:docId/:versionId', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.docId);
    if (!doc || String(doc.owner) !== String(req.user._id))
      return res.status(403).json({ message: 'Only the owner can delete versions' });

    await Version.findOneAndDelete({ _id: req.params.versionId, document: req.params.docId });
    res.json({ message: 'Version deleted' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to delete version' });
  }
});

module.exports = router;
