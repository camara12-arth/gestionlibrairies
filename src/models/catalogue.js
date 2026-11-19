const pool = require('../config/database');

async function listerCategories() {
  const resultat = await pool.query('SELECT id, nom, slug FROM categories ORDER BY nom');
  return resultat.rows;
}

async function chercherLivres({ recherche = '', categorie = '', prixMin = '', prixMax = '', disponible = '', page = 1, limite = 12 }) {
  const conditions = ['l.actif = TRUE'];
  const valeurs = [];
  const ajouter = (valeur) => {
    valeurs.push(valeur);
    return `$${valeurs.length}`;
  };

  if (recherche.trim()) {
    const terme = `%${recherche.trim()}%`;
    conditions.push(`(l.titre ILIKE ${ajouter(terme)} OR l.isbn ILIKE ${ajouter(terme)} OR EXISTS (SELECT 1 FROM livre_auteurs la JOIN auteurs a ON a.id=la.auteur_id WHERE la.livre_id=l.id AND (a.prenom ILIKE ${ajouter(terme)} OR a.nom ILIKE ${ajouter(terme)})))`);
  }
  if (categorie) conditions.push(`EXISTS (SELECT 1 FROM livre_categories lc WHERE lc.livre_id=l.id AND lc.categorie_id=${ajouter(Number(categorie))})`);
  if (prixMin !== '') conditions.push(`l.prix >= ${ajouter(Number(prixMin))}`);
  if (prixMax !== '') conditions.push(`l.prix <= ${ajouter(Number(prixMax))}`);
  if (disponible === '1') conditions.push(`COALESCE(s.quantite-s.quantite_reservee,0) > 0`);

  const offset = (Math.max(1, Number(page)) - 1) * limite;
  valeurs.push(limite, offset);
  const filtre = conditions.join(' AND ');
  const resultat = await pool.query(`
    SELECT l.*, s.quantite, s.quantite_reservee,
           GREATEST(s.quantite-s.quantite_reservee,0) AS disponible,
           ed.nom AS editeur_nom,
           COALESCE(string_agg(DISTINCT a.prenom || ' ' || a.nom, ', '), '') AS auteurs
      FROM livres l
      LEFT JOIN stock s ON s.livre_id=l.id
      LEFT JOIN editeurs ed ON ed.id=l.editeur_id
      LEFT JOIN livre_auteurs la ON la.livre_id=l.id
      LEFT JOIN auteurs a ON a.id=la.auteur_id
     WHERE ${filtre}
     GROUP BY l.id, s.quantite, s.quantite_reservee, ed.nom
     ORDER BY l.titre
     LIMIT $${valeurs.length-1} OFFSET $${valeurs.length}`, valeurs);

  const compteur = await pool.query(`SELECT COUNT(DISTINCT l.id) AS total FROM livres l LEFT JOIN stock s ON s.livre_id=l.id WHERE ${filtre}`,
    valeurs.slice(0, valeurs.length - 2));

  return { livres: resultat.rows, total: Number(compteur.rows[0].total), page: Number(page), limite };
}

async function trouverLivre(id) {
  const resultat = await pool.query(`
    SELECT l.*, s.quantite, s.quantite_reservee,
           GREATEST(s.quantite-s.quantite_reservee,0) AS disponible,
           ed.nom AS editeur_nom,
           COALESCE(string_agg(DISTINCT a.prenom || ' ' || a.nom, ', '), '') AS auteurs
      FROM livres l
      LEFT JOIN stock s ON s.livre_id=l.id
      LEFT JOIN editeurs ed ON ed.id=l.editeur_id
      LEFT JOIN livre_auteurs la ON la.livre_id=l.id
      LEFT JOIN auteurs a ON a.id=la.auteur_id
     WHERE l.id=$1 AND l.actif=TRUE
     GROUP BY l.id, s.quantite, s.quantite_reservee, ed.nom`, [id]);
  return resultat.rows[0] || null;
}

async function livresAccueuil() {
  const resultat = await pool.query(`
    SELECT l.*, GREATEST(COALESCE(s.quantite-s.quantite_reservee,0),0) AS disponible
      FROM livres l LEFT JOIN stock s ON s.livre_id=l.id
     WHERE l.actif=TRUE ORDER BY l.cree_le DESC LIMIT 8`);
  return resultat.rows;
}

module.exports = { listerCategories, chercherLivres, trouverLivre, livresAccueuil };
