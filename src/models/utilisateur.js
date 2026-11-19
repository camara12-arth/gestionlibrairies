const pool = require('../config/database');

async function trouverUtilisateurParEmail(email) {
  const resultat = await pool.query(
    `SELECT id, email, mot_de_passe_hash, prenom, nom, telephone, role, actif,
            email_verifie, cree_le, modifie_le
       FROM utilisateurs
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1`,
    [email]
  );
  return resultat.rows[0] || null;
}

async function trouverUtilisateurParId(id) {
  const resultat = await pool.query(
    `SELECT id, email, prenom, nom, telephone, role, actif, email_verifie,
            cree_le, modifie_le
       FROM utilisateurs WHERE id = $1 LIMIT 1`,
    [id]
  );
  return resultat.rows[0] || null;
}

async function emailExiste(email) {
  const resultat = await pool.query(
    'SELECT id FROM utilisateurs WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  return Boolean(resultat.rows[0]);
}

async function creerUtilisateur({ email, motDePasseHash, prenom, nom, telephone }) {
  const resultat = await pool.query(
    `INSERT INTO utilisateurs
      (email, mot_de_passe_hash, prenom, nom, telephone, role, actif, email_verifie)
     VALUES ($1, $2, $3, $4, $5, 'client', TRUE, FALSE)
     RETURNING id, email, prenom, nom, telephone, role, actif, email_verifie`,
    [email, motDePasseHash, prenom, nom, telephone]
  );
  return resultat.rows[0];
}

async function mettreAJourMotDePasse(utilisateurId, motDePasseHash) {
  await pool.query(
    `UPDATE utilisateurs
        SET mot_de_passe_hash = $1, modifie_le = NOW()
      WHERE id = $2`,
    [motDePasseHash, utilisateurId]
  );
}

module.exports = {
  trouverUtilisateurParEmail,
  trouverUtilisateurParId,
  emailExiste,
  creerUtilisateur,
  mettreAJourMotDePasse
};
