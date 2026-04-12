const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware: verify Bearer JWT and attach req.user.
 * Responds 401 if token is missing, invalid, or the user no longer exists.
 */
module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token — authorization denied' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Token invalid';
    return res.status(401).json({ message: msg });
  }
};
