const mongoose = require('mongoose');

const collaboratorSchema = new mongoose.Schema(
  {
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    permission: { type: String, enum: ['view', 'edit'], default: 'edit' },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    title: {
      type:      String,
      default:   'Untitled Document',
      trim:      true,
      maxlength: 200,
    },
    content: { type: String, default: '' },
    owner: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    collaborators: [collaboratorSchema],
    folder: { type: String, default: 'My Documents' },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    // Share-link fields
    shareToken:      { type: String, default: null, index: true, sparse: true },
    sharePermission: { type: String, enum: ['view', 'edit'], default: 'view' },

    // Layout settings persisted per-document
    pageSize: { type: String, enum: ['A4', 'Letter', 'Legal'], default: 'A4' },
    margins:  { type: String, enum: ['normal', 'narrow', 'wide', 'custom'], default: 'normal' },
    customMargins: {
      top:    { type: String, default: '' },
      right:  { type: String, default: '' },
      bottom: { type: String, default: '' },
      left:   { type: String, default: '' },
    },

    // Header/footer blocks
    headerContent: { type: String, default: '' },
    footerContent: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
