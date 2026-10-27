const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () => process.env.JWT_SECRET || 'queueless_jwt_super_secret_key_change_in_production_2026';

const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Try extracting from HttpOnly cookie
    if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    // 2. Fallback to Authorization header Bearer token (for automated testing & external clients)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to proceed.'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token. Please log in again.'
      });
    }

    // Find user
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this session no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

// Optional auth: attaches req.user if valid token present, never blocks
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, getJwtSecret());
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    // Silently continue for optional auth
  }
  next();
};

// Role-based authorization middleware
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}] role(s).`
      });
    }

    next();
  };
};

const requireAdmin = requireRole('admin');

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  getJwtSecret
};
