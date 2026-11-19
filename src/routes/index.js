const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('accueil', {
    titre: 'Librairie du Mali',
    utilisateur: req.session?.utilisateur || null
  });
});

router.get('/sante', async (req, res, next) => {
  try {
    const pool = require('../config/database');
    await pool.query('SELECT 1');
    res.json({ statut: 'ok', baseDeDonnees: 'connectée' });
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;
