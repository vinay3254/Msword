const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    document: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Document',
      required: true,
      index:    true,
    },
    anchorId: { type: String, required: true },   // data-comment-id in HTML
    text:     { type: String, required: true, maxlength: 2000 },
    author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
