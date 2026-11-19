const catalogue = require('../models/catalogue');

async function accueil(req, res, next) {
  try {
    const livres = process.env.NODE_ENV === 'test' ? [] : await catalogue.livresAccueuil();
    res.render('accueil', { titre: 'Librairie du Mali', livres });
  } catch (erreur) { next(erreur); }
}

async function liste(req, res, next) {
  try {
    const categories = await catalogue.listerCategories();
    const donnees = await catalogue.chercherLivres({
      recherche: req.query.q || '', categorie: req.query.categorie || '',
      prixMin: req.query.prix_min || '', prixMax: req.query.prix_max || '',
      disponible: req.query.disponible || '', page: req.query.page || 1
    });
    res.render('livres/liste', { titre: 'Catalogue', categories, filtres: req.query, ...donnees });
  } catch (erreur) { next(erreur); }
}

async function fiche(req, res, next) {
  try {
    const livre = await catalogue.trouverLivre(req.params.id);
    if (!livre) return res.status(404).render('404', { titre: 'Livre introuvable', chemin: req.originalUrl });
    res.render('livres/fiche', { titre: livre.titre, livre });
  } catch (erreur) { next(erreur); }
}

module.exports = { accueil, liste, fiche };
