const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../middleware/auth');
const { CSRF_COOKIE_NAME, generateToken } = require('../middleware/csrf');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

function createAndSendToken(user, statusCode, req, res) {
  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email, name: user.name },
    getJwtSecret(),
    { expiresIn: '7d' }
  );

  // Set HttpOnly JWT cookie
  res.cookie('jwt', token, COOKIE_OPTIONS);

  // Ensure CSRF cookie is set
  let csrfToken = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : null;
  if (!csrfToken) {
    csrfToken = generateToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
  }

  return res.status(statusCode).json({
    success: true,
    token, // Also return in body for testing/flexibility
    csrfToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId,
      department: user.department
    }
  });
}

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, studentId, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Role defaults to 'student'; allow 'admin' only if valid or specified
    const assignedRole = role === 'admin' ? 'admin' : 'student';

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: assignedRole,
      studentId: studentId ? studentId.trim() : '',
      department: department ? department.trim() : ''
    });

    return createAndSendToken(user, 201, req, res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message
    });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    return createAndSendToken(user, 200, req, res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to log in',
      error: error.message
    });
  }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  return res.status(200).json({
    success: true,
    message: 'Successfully logged out.'
  });
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      studentId: req.user.studentId,
      department: req.user.department
    }
  });
};

// GET /api/auth/csrf-token
exports.getCsrfToken = (req, res) => {
  let csrfToken = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : null;
  if (!csrfToken) {
    csrfToken = generateToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
  }
  return res.status(200).json({
    success: true,
    csrfToken
  });
};
