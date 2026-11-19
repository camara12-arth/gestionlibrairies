const { validationResult } = require('express-validator');
const catalogue = require('../models/catalogue');
const commandeService = require('../services/commandeService');

function panier(req) {
  req.session.panier ||= [];
  return req.session.panier;
}

async function afficher(req, res, next) {
  try {
    const articles = [];
    let total = 0;
    for (const article of panier(req)) {
      const livre = await catalogue.trouverLivre(article.livreId);
      if (!livre) continue;
      const quantite = Math.max(1, Math.min(article.quantite, livre.disponible));
      articles.push({ livre, quantite });
      total += livre.prix * quantite;
    }
    res.render('panier/liste', { titre: 'Mon panier', articles, total });
  } catch (erreur) { next(erreur); }
}

async function ajouter(req, res, next) {
  try {
    const livre = await catalogue.trouverLivre(req.body.livreId);
    if (!livre || livre.disponible < 1) return res.status(409).render('error', { titre: 'Indisponible', statut: 409, message: 'Ce livre n’est pas disponible.' });
    const quantiteDemandee = Math.min(Math.max(Number(req.body.quantite || 1), 1), livre.disponible);
    const articles = panier(req);
    const existant = articles.find((article) => article.livreId === Number(req.body.livreId));
    if (existant) existant.quantite = Math.min(existant.quantite + quantiteDemandee, livre.disponible);
    else articles.push({ livreId: Number(req.body.livreId), quantite: quantiteDemandee });
    req.session.save(() => res.redirect('/panier'));
  } catch (erreur) { next(erreur); }
}

function modifier(req, res) {
  const articles = panier(req);
  const article = articles.find((item) => item.livreId === Number(req.params.livreId));
  if (article) article.quantite = Math.max(1, Number(req.body.quantite || 1));
  req.session.save(() => res.redirect('/panier'));
}

function retirer(req, res) {
  req.session.panier = panier(req).filter((item) => item.livreId !== Number(req.params.livreId));
  req.session.save(() => res.redirect('/panier'));
}

async function afficherValidation(req, res) {
  if (!panier(req).length) return res.redirect('/panier');
  res.render('panier/validation', { titre: 'Valider la commande', erreurs: [], anciennesValeurs: req.session.utilisateur || {} });
}

async function valider(req, res, next) {
  if (!panier(req).length) return res.redirect('/panier');
  const erreurs = validationResult(req);
  if (!erreurs.isEmpty()) {
    return res.status(422).render('panier/validation', {
      titre: 'Valider la commande', erreurs: erreurs.array(), anciennesValeurs: req.body
    });
  }
  try {
    const infos = {
      prenom: req.body.prenom.trim(), nom: req.body.nom.trim(), telephone: req.body.telephone.trim(),
      email: req.body.email?.trim() || req.session.utilisateur?.email || null,
      commune: req.body.commune?.trim() || null, quartier: req.body.quartier?.trim() || null,
      adresse: req.body.adresse?.trim() || null, modeLivraison: req.body.mode_livraison,
      paiement: req.body.paiement
    };
    const commande = await commandeService.creerCommande({ panier: panier(req), infos, utilisateurId: req.session.utilisateur?.id || null });
    req.session.panier = [];
    req.session.save(() => res.redirect(`/commande/${commande.id}/confirmation`));
  } catch (erreur) { next(erreur); }
}

module.exports = { afficher, ajouter, modifier, retirer, afficherValidation, valider };
