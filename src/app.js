require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const creerSession = require('./config/session');
const routesIndex = require('./routes/index');
const { erreur404, gestionnaireErreurs } = require('./middlewares/erreurs');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));
app.use(creerSession());

app.use((req, res, next) => {
  res.locals.utilisateur = req.session.utilisateur || null;
  res.locals.csrfToken = req.csrfToken?.() || '';
  next();
});

app.use(routesIndex);
app.use(erreur404);
app.use(gestionnaireErreurs);

module.exports = app;
