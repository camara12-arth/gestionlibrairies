function estConnecte(req, res, next) {
  if (!req.session?.utilisateur) {
    return res.redirect('/connexion');
  }
  return next();
}

function aLeRole(...rolesAutorises) {
  return (req, res, next) => {
    const utilisateur = req.session?.utilisateur;

    if (!utilisateur) {
      return res.redirect('/connexion');
    }

    if (!rolesAutorises.includes(utilisateur.role)) {
      return res.status(403).render('erreur-role', {
        titre: 'Accès refusé',
        statut: 403,
        message: 'Vous n’avez pas le droit d’accéder à cette page.'
      });
    }

    return next();
  };
}

module.exports = { estConnecte, aLeRole };
