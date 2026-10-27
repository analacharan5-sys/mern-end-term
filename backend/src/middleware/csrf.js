const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-csrf-token';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Double Submit Cookie CSRF Protection Middleware
 * Sets an XSRF-TOKEN cookie on safe requests if not already set.
 * Validates matching X-CSRF-Token header on state-changing requests when session cookie is used.
 */
function csrfProtection(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  // Ensure an XSRF-TOKEN cookie is set on requests
  let csrfCookie = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : null;

  if (!csrfCookie) {
    csrfCookie = generateToken();
    res.cookie(CSRF_COOKIE_NAME, csrfCookie, {
      httpOnly: false, // Must be readable by client JavaScript to mirror into header
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });
  }

  // Safe HTTP methods do not mutate state
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // If request is authenticated via ambient HttpOnly cookie (cookie-authenticated state-changing operation),
  // CSRF validation is strictly enforced to prevent Cross-Site Request Forgery.
  const hasAuthCookie = req.cookies && req.cookies.jwt;

  if (hasAuthCookie) {
    const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers['x-csrf-token'];
    if (!headerToken || !csrfCookie || headerToken !== csrfCookie) {
      return res.status(403).json({
        success: false,
        message: 'CSRF token mismatch or missing. Please refresh and try again.'
      });
    }
  }

  next();
}

module.exports = {
  csrfProtection,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateToken
};
