const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function (req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ message: 'No token provided' });

  const token = auth.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Malformed token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.teacherId = payload.id;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
