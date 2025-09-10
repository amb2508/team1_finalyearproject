const mongoose = require('mongoose');

const ReviewItemSchema = new mongoose.Schema({
  reviewNumber: Number,
  comments: String,
  marks: [{ criteria: String, mark: String }]
});

const FileSchema = new mongoose.Schema({
  originalName: String,
  path: String,
  mimeType: String
});

const ReviewSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  className: String,
  batchName: String,
  studentRegNo: String,
  reviews: [ReviewItemSchema],
  files: [FileSchema],
  submitted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Review', ReviewSchema);
