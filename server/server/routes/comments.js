const router   = require('express').Router();
const Document = require('../models/Document');
const Comment  = require('../models/Comment');
const auth     = require('../middleware/auth');

router.use(auth);

const hasAccess = (doc, userId) =>
  String(doc.owner) === String(userId) ||
  doc.collaborators.some(c => String(c.user) === String(userId));

// ── GET /api/comments/:docId ──────────────────────────────────────────────
router.get('/:docId', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.docId);
    if (!doc || !hasAccess(doc, req.user._id))
      return res.status(404).json({ message: 'Document not found' });

    const comments = await Comment.find({ document: req.params.docId })
      .populate('author', 'name email')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

// ── POST /api/comments/:docId ─────────────────────────────────────────────
router.post('/:docId', async (req, res) => {
  try {
    const { anchorId, text } = req.body;
    if (!anchorId || !text) return res.status(400).json({ message: 'anchorId and text required' });

    const doc = await Document.findById(req.params.docId);
    if (!doc || !hasAccess(doc, req.user._id))
      return res.status(404).json({ message: 'Document not found' });

    const comment = await Comment.create({
      document: req.params.docId,
      anchorId,
      text:     text.slice(0, 2000),
      author:   req.user._id,
    });
    await comment.populate('author', 'name email');
    res.status(201).json(comment);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

// ── PATCH /api/comments/:docId/:commentId ─────────────────────────────────
router.patch('/:docId/:commentId', async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id:      req.params.commentId,
      document: req.params.docId,
    });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Only author can edit text; anyone with access can resolve
    if (req.body.text !== undefined) {
      if (String(comment.author) !== String(req.user._id))
        return res.status(403).json({ message: 'Not your comment' });
      comment.text = req.body.text.slice(0, 2000);
    }
    if (req.body.resolved !== undefined) comment.resolved = Boolean(req.body.resolved);

    await comment.save();
    await comment.populate('author', 'name email');
    res.json(comment);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to update comment' });
  }
});

// ── DELETE /api/comments/:docId/:commentId ────────────────────────────────
router.delete('/:docId/:commentId', async (req, res) => {
  try {
    const doc     = await Document.findById(req.params.docId);
    const comment = await Comment.findOne({ _id: req.params.commentId, document: req.params.docId });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const isOwner    = doc && String(doc.owner) === String(req.user._id);
    const isAuthor   = String(comment.author)   === String(req.user._id);
    if (!isOwner && !isAuthor)
      return res.status(403).json({ message: 'Permission denied' });

    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
});

module.exports = router;
