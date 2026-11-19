const { doubleCsrf } = require('csrf-csrf');

const {
  doubleCsrfProtection,
  generateCsrfToken
} = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET,
  getSessionIdentifier: (req) => req.session?.id || 'anonyme',
  cookieName: '__Host-librairie.csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  getTokenFromRequest: (req) => req.body?._csrf,
  size: 64
});

module.exports = { doubleCsrfProtection, generateCsrfToken };
