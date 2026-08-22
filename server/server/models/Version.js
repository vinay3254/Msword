const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema(
  {
    document: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Document',
      required: true,
      index:    true,
    },
    content:  { type: String, default: '' },
    title:    { type: String, default: 'Untitled Document' },
    savedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    label:    { type: String, default: '', maxlength: 100 },
  },
  { timestamps: true }
);

// Keep at most 30 versions per document — trim oldest on insert
versionSchema.statics.createAndTrim = async function (data) {
  const doc = await this.create(data);
  const count = await this.countDocuments({ document: data.document });
  if (count > 30) {
    const oldest = await this.find({ document: data.document })
      .sort({ createdAt: 1 })
      .limit(count - 30)
      .select('_id');
    await this.deleteMany({ _id: { $in: oldest.map(v => v._id) } });
  }
  return doc;
};

module.exports = mongoose.model('Version', versionSchema);
