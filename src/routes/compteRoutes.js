const express = require('express');
const { estConnecte, aLeRole } = require('../middlewares/auth');
const controller = require('../controllers/compteController');

const router = express.Router();
router.get('/compte/commandes', estConnecte, aLeRole('client'), controller.historique);
router.get('/commande/:id/confirmation', controller.confirmation);
router.get('/commande/:id/facture', controller.facture);
router.get('/compte/souhaits', estConnecte, aLeRole('client'), controller.souhaits);
router.post('/livres/:livreId/souhait', estConnecte, aLeRole('client'), controller.basculerSouhait);
router.get('/admin', estConnecte, aLeRole('admin', 'libraire'), (req, res) => {
  res.render('admin', { titre: 'Back-office', utilisateur: req.session.utilisateur });
});
router.get('/compte', estConnecte, aLeRole('client'), (req, res) => {
  res.render('compte', { titre: 'Mon compte', utilisateur: req.session.utilisateur });
});

module.exports = router;
