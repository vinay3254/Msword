const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    title: {
      type:    String,
      default: 'Untitled Document',
      trim:    true,
      maxlength: 200,
    },
    content: {
      type:    String,
      default: '',
    },
    owner: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    collaborators: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ],
    lastModified: {
      type:    Date,
      default: Date.now,
      index:   true,
    },
  },
  { timestamps: true }
);

// Update lastModified on every save
documentSchema.pre('save', function (next) {
  this.lastModified = new Date();
  next();
});

module.exports = mongoose.model('Document', documentSchema);
