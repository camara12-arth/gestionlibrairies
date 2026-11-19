const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const utilisateurs = require('../models/utilisateur');
const pool = require('../config/database');

function afficherInscription(req, res) {
  res.render('auth/inscription', { titre: 'Créer un compte', erreurs: [], anciennesValeurs: {} });
}

async function inscrire(req, res, next) {
  const erreurs = validationResult(req);
  if (!erreurs.isEmpty()) {
    return res.status(422).render('auth/inscription', {
      titre: 'Créer un compte',
      erreurs: erreurs.array(),
      anciennesValeurs: req.body
    });
  }

  try {
    if (await utilisateurs.emailExiste(req.body.email.trim().toLowerCase())) {
      return res.status(422).render('auth/inscription', {
        titre: 'Créer un compte',
        erreurs: [{ msg: 'Cette adresse e-mail est déjà utilisée.' }],
        anciennesValeurs: req.body
      });
    }

    const motDePasseHash = await bcrypt.hash(req.body.mot_de_passe, 12);
    const utilisateur = await utilisateurs.creerUtilisateur({
      email: req.body.email.trim().toLowerCase(),
      motDePasseHash,
      prenom: req.body.prenom.trim(),
      nom: req.body.nom.trim(),
      telephone: req.body.telephone?.trim() || null
    });

    const jeton = crypto.randomBytes(32).toString('hex');
    const jetonHash = crypto.createHash('sha256').update(jeton).digest('hex');
    await pool.query(
      `INSERT INTO jetons_utilisateur (utilisateur_id, type, jeton_hash, expire_le)
       VALUES ($1, 'verification_email', $2, NOW() + INTERVAL '24 hours')`,
      [utilisateur.id, jetonHash]
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log(`Lien de vérification e-mail : ${process.env.APP_URL}/verification-email/${jeton}`);
    }

    req.session.message = 'Compte créé. Consultez le lien de vérification affiché dans la console en développement.';
    return res.redirect('/connexion');
  } catch (erreur) {
    return next(erreur);
  }
}

function afficherConnexion(req, res) {
  res.render('auth/connexion', {
    titre: 'Connexion',
    erreurs: [],
    message: req.session.message || null,
    anciennesValeurs: {}
  });
  delete req.session.message;
}

async function connecter(req, res, next) {
  const erreurs = validationResult(req);
  if (!erreurs.isEmpty()) {
    return res.status(422).render('auth/connexion', {
      titre: 'Connexion', erreurs: erreurs.array(), message: null, anciennesValeurs: req.body
    });
  }

  try {
    const utilisateur = await utilisateurs.trouverUtilisateurParEmail(req.body.email.trim().toLowerCase());
    const motDePasseValide = utilisateur
      ? await bcrypt.compare(req.body.mot_de_passe, utilisateur.mot_de_passe_hash)
      : false;

    if (!utilisateur || !motDePasseValide || !utilisateur.actif) {
      return res.status(401).render('auth/connexion', {
        titre: 'Connexion',
        erreurs: [{ msg: 'E-mail ou mot de passe incorrect.' }],
        message: null,
        anciennesValeurs: req.body
      });
    }

    req.session.regenerate((erreurSession) => {
      if (erreurSession) return next(erreurSession);
      req.session.utilisateur = {
        id: utilisateur.id,
        email: utilisateur.email,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        role: utilisateur.role
      };
      req.session.save((erreurSauvegarde) => {
        if (erreurSauvegarde) return next(erreurSauvegarde);
        if (['admin', 'libraire'].includes(utilisateur.role)) return res.redirect('/admin');
        return res.redirect('/compte');
      });
    });
  } catch (erreur) {
    return next(erreur);
  }
}

function deconnecter(req, res, next) {
  req.session.destroy((erreur) => {
    if (erreur) return next(erreur);
    res.clearCookie('librairie.sid');
    return res.redirect('/');
  });
}

function afficherMotDePasseOublie(req, res) {
  res.render('auth/mot-de-passe-oublie', { titre: 'Mot de passe oublié', erreurs: [], message: null });
}

async function demanderMotDePasse(req, res, next) {
  const erreurs = validationResult(req);
  if (!erreurs.isEmpty()) {
    return res.status(422).render('auth/mot-de-passe-oublie', {
      titre: 'Mot de passe oublié', erreurs: erreurs.array(), message: null
    });
  }

  try {
    const utilisateur = await utilisateurs.trouverUtilisateurParEmail(req.body.email.trim().toLowerCase());
    if (utilisateur) {
      const jeton = crypto.randomBytes(32).toString('hex');
      const jetonHash = crypto.createHash('sha256').update(jeton).digest('hex');
      await pool.query(
        `INSERT INTO jetons_utilisateur (utilisateur_id, type, jeton_hash, expire_le)
         VALUES ($1, 'reinitialisation_mot_de_passe', $2, NOW() + INTERVAL '1 hour')`,
        [utilisateur.id, jetonHash]
      );
      console.log(`Lien de réinitialisation : ${process.env.APP_URL}/reinitialiser-mot-de-passe/${jeton}`);
    }

    return res.render('auth/mot-de-passe-oublie', {
      titre: 'Mot de passe oublié', erreurs: [],
      message: 'Si ce compte existe, un lien de réinitialisation vient d’être préparé.'
    });
  } catch (erreur) {
    return next(erreur);
  }
}

async function verifierEmail(req, res, next) {
  try {
    const jetonHash = crypto.createHash('sha256').update(req.params.jeton).digest('hex');
    const resultat = await pool.query(
      `UPDATE utilisateurs u
          SET email_verifie = TRUE, modifie_le = NOW()
         FROM jetons_utilisateur j
        WHERE j.utilisateur_id = u.id
          AND j.type = 'verification_email'
          AND j.jeton_hash = $1
          AND j.utilise_le IS NULL
          AND j.expire_le > NOW()
       RETURNING u.id`,
      [jetonHash]
    );

    if (!resultat.rows[0]) {
      return res.status(400).render('error', {
        titre: 'Lien invalide', statut: 400,
        message: 'Ce lien de vérification est invalide ou a expiré.'
      });
    }

    await pool.query(
      `UPDATE jetons_utilisateur SET utilise_le = NOW()
        WHERE type = 'verification_email' AND jeton_hash = $1`,
      [jetonHash]
    );
    req.session.message = 'Votre adresse e-mail a été vérifiée.';
    return res.redirect('/connexion');
  } catch (erreur) {
    return next(erreur);
  }
}

async function afficherReinitialisation(req, res, next) {
  try {
    const jetonHash = crypto.createHash('sha256').update(req.params.jeton).digest('hex');
    const resultat = await pool.query(
      `SELECT id FROM jetons_utilisateur
        WHERE type = 'reinitialisation_mot_de_passe'
          AND jeton_hash = $1 AND utilise_le IS NULL AND expire_le > NOW()
        LIMIT 1`,
      [jetonHash]
    );

    if (!resultat.rows[0]) {
      return res.status(400).render('error', {
        titre: 'Lien invalide', statut: 400,
        message: 'Ce lien de réinitialisation est invalide ou a expiré.'
      });
    }

    return res.render('auth/reinitialiser-mot-de-passe', {
      titre: 'Réinitialiser le mot de passe', jeton: req.params.jeton, erreurs: []
    });
  } catch (erreur) {
    return next(erreur);
  }
}

async function reinitialiserMotDePasse(req, res, next) {
  const erreurs = validationResult(req);
  if (!erreurs.isEmpty()) {
    return res.status(422).render('auth/reinitialiser-mot-de-passe', {
      titre: 'Réinitialiser le mot de passe', jeton: req.params.jeton,
      erreurs: erreurs.array()
    });
  }

  try {
    const jetonHash = crypto.createHash('sha256').update(req.params.jeton).digest('hex');
    const resultat = await pool.query(
      `SELECT utilisateur_id FROM jetons_utilisateur
        WHERE type = 'reinitialisation_mot_de_passe'
          AND jeton_hash = $1 AND utilise_le IS NULL AND expire_le > NOW()
        LIMIT 1`,
      [jetonHash]
    );

    if (!resultat.rows[0]) {
      return res.status(400).render('error', {
        titre: 'Lien invalide', statut: 400,
        message: 'Ce lien de réinitialisation est invalide ou a expiré.'
      });
    }

    const motDePasseHash = await bcrypt.hash(req.body.mot_de_passe, 12);
    await utilisateurs.mettreAJourMotDePasse(resultat.rows[0].utilisateur_id, motDePasseHash);
    await pool.query(
      `UPDATE jetons_utilisateur SET utilise_le = NOW()
        WHERE type = 'reinitialisation_mot_de_passe' AND jeton_hash = $1`,
      [jetonHash]
    );

    req.session.message = 'Votre mot de passe a été changé.';
    return res.redirect('/connexion');
  } catch (erreur) {
    return next(erreur);
  }
}

module.exports = {
  afficherInscription, inscrire, afficherConnexion, connecter, deconnecter,
  afficherMotDePasseOublie, demanderMotDePasse, verifierEmail,
  afficherReinitialisation, reinitialiserMotDePasse
};
