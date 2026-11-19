const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const auth = require('../controllers/authController');

const router = express.Router();

const limiteConnexion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
});

router.get('/inscription', auth.afficherInscription);
router.post('/inscription', [
  body('prenom').trim().isLength({ min: 2, max: 100 }).withMessage('Le prénom doit contenir au moins 2 caractères.'),
  body('nom').trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir au moins 2 caractères.'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Adresse e-mail invalide.'),
  body('telephone').optional({ checkFalsy: true }).trim().matches(/^\+?[0-9\s-]{8,30}$/).withMessage('Numéro de téléphone invalide.'),
  body('mot_de_passe').isLength({ min: 10 }).withMessage('Le mot de passe doit contenir au moins 10 caractères.')
], auth.inscrire);

router.get('/connexion', auth.afficherConnexion);
router.post('/connexion', limiteConnexion, [
  body('email').trim().isEmail().normalizeEmail().withMessage('Adresse e-mail invalide.'),
  body('mot_de_passe').notEmpty().withMessage('Le mot de passe est obligatoire.')
], auth.connecter);

router.post('/deconnexion', auth.deconnecter);
router.get('/mot-de-passe-oublie', auth.afficherMotDePasseOublie);
router.post('/mot-de-passe-oublie', [
  body('email').trim().isEmail().normalizeEmail().withMessage('Adresse e-mail invalide.')
], auth.demanderMotDePasse);

router.get('/verification-email/:jeton', auth.verifierEmail);
router.get('/reinitialiser-mot-de-passe/:jeton', auth.afficherReinitialisation);
router.post('/reinitialiser-mot-de-passe/:jeton', [
  body('mot_de_passe').isLength({ min: 10 }).withMessage('Le mot de passe doit contenir au moins 10 caractères.'),
  body('confirmation').custom((valeur, { req }) => valeur === req.body.mot_de_passe).withMessage('Les mots de passe ne correspondent pas.')
], auth.reinitialiserMotDePasse);

module.exports = router;
