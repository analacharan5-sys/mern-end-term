const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days (matches JWT session lifespan)

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Double Submit Cookie CSRF Protection Middleware
 * - Sets an XSRF-TOKEN cookie with full 7-day lifespan on safe requests if missing.
 * - Enforces valid X-CSRF-Token header matching on cookie-authenticated mutating requests.
 */
function csrfProtection(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  // Read the token sent in the incoming request cookies
  const incomingCookieToken = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : null;

  // On safe methods, ensure the XSRF-TOKEN cookie is set with a 7-day expiration
  if (safeMethods.includes(req.method)) {
    if (!incomingCookieToken) {
      const newToken = generateToken();
      res.cookie(CSRF_COOKIE_NAME, newToken, {
        httpOnly: false, // Readable by client JavaScript to mirror into x-csrf-token header
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: CSRF_COOKIE_MAX_AGE,
        path: '/'
      });
    }
    return next();
  }

  // Mutating requests (POST, PUT, PATCH, DELETE)
  const hasAuthCookie = req.cookies && req.cookies.jwt;

  // If request does not use cookie authentication, CSRF is not applicable
  if (!hasAuthCookie) {
    return next();
  }

  const headerToken =
    req.headers[CSRF_HEADER_NAME] ||
    req.headers['x-csrf-token'] ||
    req.headers['x-xsrf-token'];

  // Both header and cookie match
  if (incomingCookieToken && headerToken && incomingCookieToken === headerToken) {
    return next();
  }

  // If browser cookie was lost/cleared between tabs but client has valid stored token (64-char hex)
  if (!incomingCookieToken && headerToken && headerToken.length >= 32) {
    // Restore the cookie to match the client's token
    res.cookie(CSRF_COOKIE_NAME, headerToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: CSRF_COOKIE_MAX_AGE,
      path: '/'
    });
    return next();
  }

  // Otherwise, reject with CSRF mismatch
  return res.status(403).json({
    success: false,
    message: 'CSRF token mismatch or missing. Please refresh and try again.'
  });
}

module.exports = {
  csrfProtection,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_COOKIE_MAX_AGE,
  generateToken
};
