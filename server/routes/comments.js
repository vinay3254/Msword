const router   = require('express').Router();
const Document = require('../models/Document');
const Comment  = require('../models/Comment');
const auth     = require('../middleware/auth');

router.use(auth);

const hasAccess = (doc, userId) =>
  String(doc.owner) === String(userId) ||
  doc.collaborators.some(c => String(c.user) === String(userId));

const extractMentions = (text, candidates) => {
  const mentionNames = Array.from((text || '').matchAll(/@([\w.-]+)/g)).map(m => m[1].toLowerCase());
  if (!mentionNames.length) return [];

  const ids = new Set();
  candidates.forEach((u) => {
    if (!u?._id || !u?.name) return;
    const normalized = String(u.name).toLowerCase().replace(/\s+/g, '');
    const plain = String(u.name).toLowerCase();
    if (mentionNames.includes(normalized) || mentionNames.includes(plain)) {
      ids.add(String(u._id));
    }
  });
  return Array.from(ids);
};

// ── GET /api/comments/:docId ──────────────────────────────────────────────
router.get('/:docId', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.docId);
    if (!doc || !hasAccess(doc, req.user._id))
      return res.status(404).json({ message: 'Document not found' });

    const comments = await Comment.find({ document: req.params.docId })
      .populate('author', 'name email')
      .populate('replies.author', 'name email')
      .populate('replies.mentions', 'name email')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

// ── POST /api/comments/:commentId/reply ───────────────────────────────────
router.post('/:commentId/reply', async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Reply text required' });

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Not found' });

    const doc = await Document.findById(comment.document)
      .populate('owner', 'name email')
      .populate('collaborators.user', 'name email');

    if (!doc || !hasAccess(doc, req.user._id)) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const collaborators = [
      doc.owner,
      ...doc.collaborators.map(c => c.user),
    ].filter(Boolean);
    const mentions = extractMentions(text, collaborators);

    comment.replies.push({
      author: req.user._id,
      text: text.slice(0, 2000),
      mentions,
    });

    await comment.save();
    await comment.populate('author', 'name email');
    await comment.populate('replies.author', 'name email');
    await comment.populate('replies.mentions', 'name email');
    res.json(comment);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to add reply' });
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
    if (req.body.anchorId !== undefined) {
      if (String(comment.author) !== String(req.user._id))
        return res.status(403).json({ message: 'Not your comment' });
      comment.anchorId = String(req.body.anchorId);
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
