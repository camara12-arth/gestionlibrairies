const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/panierController');

const router = express.Router();
router.get('/panier', controller.afficher);
router.post('/panier/ajouter', [
  body('livreId').isInt({ min: 1 }).toInt(),
  body('quantite').optional().isInt({ min: 1, max: 99 }).toInt()
], controller.ajouter);
router.post('/panier/modifier/:livreId', controller.modifier);
router.post('/panier/retirer/:livreId', controller.retirer);
router.get('/commande/valider', controller.afficherValidation);
router.post('/commande/valider', [
  body('prenom').trim().isLength({ min: 2, max: 100 }),
  body('nom').trim().isLength({ min: 2, max: 100 }),
  body('telephone').trim().matches(/^\+?[0-9\s-]{8,30}$/),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('mode_livraison').isIn(['livraison','retrait']),
  body('paiement').isIn(['livraison','retrait','orange','moov'])
], controller.valider);

module.exports = router;
