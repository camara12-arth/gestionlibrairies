const express = require('express');
const controller = require('../controllers/catalogueController');

const router = express.Router();
router.get('/', controller.accueil);
router.get('/livres', controller.liste);
router.get('/livres/:id', controller.fiche);

module.exports = router;
