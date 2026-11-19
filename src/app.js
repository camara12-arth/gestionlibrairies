require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const creerSession = require('./config/session');
const { doubleCsrfProtection, generateCsrfToken } = require('./config/csrf');
const routesIndex = require('./routes/index');
const routesAuth = require('./routes/authRoutes');
const routesCompte = require('./routes/compteRoutes');
const routesCatalogue = require('./routes/catalogueRoutes');
const routesPanier = require('./routes/panierRoutes');
const routesAdmin = require('./routes/adminRoutes');
const routesStock = require('./routes/stockRoutes');
const routesMetier = require('./routes/metierRoutes');
const routesCatalogueAdmin = require('./routes/catalogueAdminRoutes');
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
app.use(cookieParser());
app.use(doubleCsrfProtection);

app.use((req, res, next) => {
  res.locals.utilisateur = req.session.utilisateur || null;
  res.locals.csrfToken = generateCsrfToken(req, res);
  next();
});

app.use(routesIndex);
app.use(routesCatalogue);
app.use(routesPanier);
app.use(routesAuth);
app.use(routesCompte);
app.use(routesAdmin);
app.use(routesStock);
app.use(routesMetier);
app.use(routesCatalogueAdmin);
app.use(erreur404);
app.use(gestionnaireErreurs);

module.exports = app;
