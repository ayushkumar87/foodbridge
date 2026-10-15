const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

function createToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function userResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    organizationName: user.organizationName,
    volunteerProfile: user.volunteerProfile
  };
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, phone, organizationName, volunteerProfile } = req.body;
    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists.' });

    const user = await User.create({ name, email, password, role, phone, organizationName, volunteerProfile });
    return res.status(201).json({ token: createToken(user), user: userResponse(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: String(req.body.email).toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(req.body.password))) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }
    return res.json({ token: createToken(user), user: userResponse(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', protect, (req, res) => res.json({ user: req.user }));

router.put('/me', protect, async (req, res, next) => {
  try {
    const allowedFields = ['name', 'phone', 'organizationName', 'volunteerProfile'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) req.user[field] = req.body[field];
    });
    await req.user.save();
    return res.json({ user: userResponse(req.user) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
