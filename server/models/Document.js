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
    lastModified: { type: Date, default: Date.now, index: true },

    // Share-link fields
    shareToken:      { type: String, default: null, index: true, sparse: true },
    sharePermission: { type: String, enum: ['view', 'edit'], default: 'view' },

    // Layout settings persisted per-document
    pageSize: { type: String, enum: ['A4', 'Letter', 'Legal'], default: 'A4' },
    margins:  { type: String, enum: ['normal', 'narrow', 'wide'], default: 'normal' },
  },
  { timestamps: true }
);

documentSchema.pre('save', function (next) {
  this.lastModified = new Date();
  next();
});

module.exports = mongoose.model('Document', documentSchema);
