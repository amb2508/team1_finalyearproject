const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
  fullname: { type: String, required: true, unique: true },
  department: { type: String },
  passwordHash: { type: String, required: true },
  email: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Teacher', TeacherSchema);
