require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Models
const Teacher = require('./models/Teacher');
const Batch = require('./models/Batch');
const Review = require('./models/Review');

// Middleware
const auth = require('./middleware/auth');

// Port
const PORT = process.env.PORT || 4000;

// Allow frontend
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads dir exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ts = Date.now();
    cb(null, ts + '_' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

/** ---------------------------
 * MongoDB connection
 * --------------------------- */
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

/** ---------------------------
 * Serve frontend files
 * --------------------------- */
app.use(express.static(path.join(__dirname, 'public')));

// Root route → serve registration.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'registration.html'));
});

// Explicit route for documents.html
app.get('/Documents.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Documents.html'));
});

// ✅ Catch-all for non-API routes (Express 5 safe)
app.use((req, res, next) => {
  const apiRoutes = [
    '/register','/teacher-login','/forgot-password',
    '/batches','/studentinfo','/saveReview',
    '/submitReview','/reviews'
  ];
  if (apiRoutes.some(r => req.path.startsWith(r))) return next();

  // Let static file requests through
  if (path.extname(req.path)) return next();

  // Default SPA fallback
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/** ---------------------------
 * API ROUTES
 * --------------------------- */

// Register teacher
app.post('/register', async (req, res) => {
  try {
    const { fullname, department, password } = req.body;
    if (!fullname || !password) return res.status(400).json({ message: 'Fullname and password required' });

    const existing = await Teacher.findOne({ fullname });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hash = await bcrypt.hash(password, 10);
    const teacher = new Teacher({ fullname, department, passwordHash: hash });
    await teacher.save();

    return res.json({ message: 'Registration successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/teacher-login', async (req, res) => {
  try {
    const { fullname, password } = req.body;
    const teacher = await Teacher.findOne({ fullname });
    if (!teacher) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, teacher.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: teacher._id, fullname: teacher.fullname },
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: '12h' }
    );
    return res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Forgot password (stub)
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  return res.json({
    message: `Password reset is not automated yet. Please contact the administrator. (You entered: ${email})`
  });
});

// Add batch
app.post('/batches', auth, async (req, res) => {
  try {
    const teacherId = req.teacherId;
    const { className, batchName } = req.body;

    const batch = new Batch({ teacher: teacherId, className, batchName, projectTitle: '', students: [] });
    await batch.save();

    return res.json({ message: 'Batch added', batch });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get batches for section
app.get('/batches/:section', auth, async (req, res) => {
  try {
    const teacherId = req.teacherId;
    const section = req.params.section;
    const batches = await Batch.find({ teacher: teacherId, className: section }).lean();
    return res.json(batches);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Save student info
app.post('/studentinfo', auth, async (req, res) => {
  try {
    const teacherId = req.teacherId;
    const { batch, projectTitle, students } = req.body;

    let existing = await Batch.findOne({ teacher: teacherId, batchName: batch });
    if (!existing) {
      existing = new Batch({ teacher: teacherId, batchName: batch, projectTitle, students });
    } else {
      existing.projectTitle = projectTitle;
      existing.students = students;
    }
    await existing.save();
    return res.json({ message: 'Student info saved', record: existing });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.get('/studentinfo', auth, async (req, res) => {
  try {
    const teacherId = req.teacherId;
    const batches = await Batch.find({ teacher: teacherId }).lean();
    return res.json(batches);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Save review
app.post('/saveReview', auth, upload.array('files'), async (req, res) => {
  try {
    const teacherId = req.teacherId;
    const reviewData = JSON.parse(req.body.reviewData || '{}');

    let record = await Review.findOne({ teacher: teacherId, studentRegNo: reviewData.studentId });
    const files = (req.files || []).map(f => ({
      originalName: f.originalname,
      path: `/uploads/${path.basename(f.path)}`,
      mimeType: f.mimetype
    }));

    if (!record) {
      record = new Review({
        teacher: teacherId,
        studentRegNo: reviewData.studentId,
        reviews: reviewData.reviews || [],
        files
      });
    } else {
      record.reviews = reviewData.reviews || record.reviews;
      record.files = record.files.concat(files);
      record.submitted = false;
    }
    await record.save();
    return res.json({ message: 'Review saved' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Submit review
app.post('/submitReview', auth, upload.array('files'), async (req, res) => {
  try {
    const teacherId = req.teacherId;
    const reviewData = JSON.parse(req.body.reviewData || '{}');

    let record = await Review.findOne({ teacher: teacherId, studentRegNo: reviewData.studentId });
    const files = (req.files || []).map(f => ({
      originalName: f.originalname,
      path: `/uploads/${path.basename(f.path)}`,
      mimeType: f.mimetype
    }));

    if (!record) {
      record = new Review({
        teacher: teacherId,
        studentRegNo: reviewData.studentId,
        reviews: reviewData.reviews || [],
        files,
        submitted: true
      });
    } else {
      record.reviews = reviewData.reviews || record.reviews;
      record.files = record.files.concat(files);
      record.submitted = true;
    }
    await record.save();
    return res.json({ message: 'Review submitted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get reviews
app.get('/reviews', auth, async (req, res) => {
  try {
    const teacherId = req.teacherId;
    const studentId = req.query.studentId;
    const records = await Review.find({ teacher: teacherId, studentRegNo: studentId }).lean();
    return res.json(records);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR));

// Start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
