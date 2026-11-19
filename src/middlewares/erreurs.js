// Page centralisée pour les erreurs HTTP.
function erreur404(req, res) {
  res.status(404).render('404', {
    titre: 'Page introuvable',
    chemin: req.originalUrl
  });
}

function gestionnaireErreurs(erreur, req, res, _next) {
  const statut = erreur.statusCode || erreur.status || 500;
  console.error(erreur);

  if (req.accepts(['html', 'json']) === 'json') {
    return res.status(statut).json({
      erreur: erreur.message || 'Erreur interne du serveur'
    });
  }

  res.status(statut).render('error', {
    titre: 'Une erreur est survenue',
    statut,
    message: statut === 500 && process.env.NODE_ENV === 'production'
      ? 'Veuillez réessayer dans quelques instants.'
      : erreur.message
  });
}

module.exports = { erreur404, gestionnaireErreurs };
