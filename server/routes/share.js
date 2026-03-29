const router   = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const User     = require('../models/User');
const auth     = require('../middleware/auth');

// ── POST /api/share/:docId — generate share link (owner only) ────────────
router.post('/:docId', auth, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.docId, owner: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found or not the owner' });

    doc.shareToken      = uuidv4();
    doc.sharePermission = req.body.permission === 'edit' ? 'edit' : 'view';
    await doc.save();

    const link = `${req.protocol}://${req.get('host').replace('5000', '5173')}/shared/${doc.shareToken}`;
    res.json({ shareToken: doc.shareToken, sharePermission: doc.sharePermission, link });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to generate share link' });
  }
});

// ── DELETE /api/share/:docId — revoke share link (owner only) ───────────
router.delete('/:docId', auth, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.docId, owner: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    doc.shareToken = null;
    await doc.save();
    res.json({ message: 'Share link revoked' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to revoke share link' });
  }
});

// ── GET /api/share/doc/:token — fetch doc by share token (public) ────────
router.get('/doc/:token', async (req, res) => {
  try {
    const doc = await Document.findOne({ shareToken: req.params.token })
      .populate('owner', 'name email');
    if (!doc) return res.status(404).json({ message: 'Link not found or has been revoked' });
    res.json({
      _id:             doc._id,
      title:           doc.title,
      content:         doc.content,
      sharePermission: doc.sharePermission,
      owner:           doc.owner,
      lastModified:    doc.lastModified,
      pageSize:        doc.pageSize,
      margins:         doc.margins,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch shared document' });
  }
});

// ── POST /api/share/:docId/collaborators — add collaborator by email ─────
router.post('/:docId/collaborators', auth, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.docId, owner: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const { email, permission } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const target = await User.findOne({ email: email.toLowerCase().trim() });
    if (!target) return res.status(404).json({ message: 'No user with that email' });
    if (String(target._id) === String(doc.owner))
      return res.status(400).json({ message: 'Owner cannot be a collaborator' });

    const existing = doc.collaborators.find(c => String(c.user) === String(target._id));
    if (existing) {
      existing.permission = permission === 'view' ? 'view' : 'edit';
    } else {
      doc.collaborators.push({ user: target._id, permission: permission === 'view' ? 'view' : 'edit' });
    }
    await doc.save();
    await doc.populate('collaborators.user', 'name email');
    res.json(doc.collaborators);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to add collaborator' });
  }
});

// ── DELETE /api/share/:docId/collaborators/:userId ───────────────────────
router.delete('/:docId/collaborators/:userId', auth, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.docId, owner: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    doc.collaborators = doc.collaborators.filter(c => String(c.user) !== req.params.userId);
    await doc.save();
    res.json({ message: 'Collaborator removed' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Document not found' });
    console.error(err);
    res.status(500).json({ message: 'Failed to remove collaborator' });
  }
});

module.exports = router;
