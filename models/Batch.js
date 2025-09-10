const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  regNo: { type: String, required: true },
  name: String,
  email: String,
  marks: String,
  comments: String
});

const BatchSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  className: String,
  batchName: String,
  projectTitle: String,
  students: [StudentSchema]
}, { timestamps: true });

module.exports = mongoose.model('Batch', BatchSchema);
