const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User   = require('../models/User');

// Helper: sign a 7-day JWT
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Helper: format validation errors
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    return false;
  }
  return true;
};

// ── POST /api/auth/register ───────────────────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
    body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const { name, email, password } = req.body;

      if (await User.findOne({ email })) {
        return res.status(409).json({ message: 'An account with that email already exists' });
      }

      const user  = await User.create({ name, email, password });
      const token = signToken(user._id);

      res.status(201).json({
        token,
        user: { id: user._id, name: user.name, email: user.email },
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ message: 'Server error during registration' });
    }
  }
);

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const { email, password } = req.body;

      // Need password field (it's select:false in schema)
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = signToken(user._id);
      res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error during login' });
    }
  }
);

// ── GET /api/auth/me ──────────────────────────────────────────────────────
const authMiddleware = require('../middleware/auth');
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email } });
});

module.exports = router;
