const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./database');

function creerSession() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET doit être configuré dans le fichier .env');
  }

  return session({
    store: new pgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    }),
    name: 'librairie.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    }
  });
}

module.exports = creerSession;
