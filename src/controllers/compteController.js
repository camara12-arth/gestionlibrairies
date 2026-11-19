const pool = require('../config/database');
const PDFDocument = require('pdfkit');

async function historique(req, res, next) {
  try {
    const resultat = await pool.query(`SELECT c.*, COALESCE(json_agg(json_build_object('livre_id',lc.livre_id,'titre',l.titre,'quantite',lc.quantite,'prix_unitaire',lc.prix_unitaire)) FILTER (WHERE lc.id IS NOT NULL),'[]') AS lignes
      FROM commandes c LEFT JOIN lignes_commande lc ON lc.commande_id=c.id
      LEFT JOIN livres l ON l.id=lc.livre_id
      WHERE c.utilisateur_id=$1 GROUP BY c.id ORDER BY c.cree_le DESC`, [req.session.utilisateur.id]);
    res.render('compte/commandes', { titre: 'Mes commandes', commandes: resultat.rows });
  } catch (erreur) { next(erreur); }
}

async function confirmation(req, res, next) {
  try {
    const resultat = await pool.query(`SELECT c.* FROM commandes c WHERE c.id=$1`, [req.params.id]);
    if (!resultat.rows[0]) return res.status(404).render('404', { titre: 'Commande introuvable', chemin: req.originalUrl });
    res.render('compte/confirmation', { titre: 'Commande confirmée', commande: resultat.rows[0] });
  } catch (erreur) { next(erreur); }
}

async function facture(req, res, next) {
  try {
    const commande = await pool.query(`SELECT c.* FROM commandes c WHERE c.id=$1`, [req.params.id]);
    const lignes = await pool.query(`SELECT lc.*, l.titre FROM lignes_commande lc JOIN livres l ON l.id=lc.livre_id WHERE lc.commande_id=$1`, [req.params.id]);
    if (!commande.rows[0]) return res.status(404).render('404', { titre: 'Commande introuvable', chemin: req.originalUrl });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="facture-${commande.rows[0].reference}.pdf"`);
    const pdf = new PDFDocument({ margin: 50 });
    pdf.pipe(res);
    pdf.fontSize(18).text('LIBRAIRIE DU MALI', { align: 'center' });
    pdf.moveDown().fontSize(12).text(`Facture ${commande.rows[0].reference}`);
    pdf.text(`Client : ${commande.rows[0].prenom} ${commande.rows[0].nom}`);
    pdf.text(`Téléphone : ${commande.rows[0].telephone}`);
    pdf.moveDown();
    lignes.rows.forEach((ligne) => pdf.text(`${ligne.titre} — ${ligne.quantite} x ${ligne.prix_unitaire} FCFA`));
    pdf.moveDown().text(`Sous-total : ${commande.rows[0].sous_total} FCFA`);
    pdf.text(`Livraison : ${commande.rows[0].frais_livraison} FCFA`);
    pdf.fontSize(14).text(`Total : ${commande.rows[0].total} FCFA`);
    pdf.end();
  } catch (erreur) { next(erreur); }
}

async function souhaits(req, res, next) {
  try {
    const liste = await pool.query(`SELECT l.* FROM souhaits s JOIN livres l ON l.id=s.livre_id WHERE s.utilisateur_id=$1 ORDER BY s.ajoute_le DESC`, [req.session.utilisateur.id]);
    res.render('compte/souhaits', { titre: 'Ma liste de souhaits', livres: liste.rows });
  } catch (erreur) { next(erreur); }
}

async function basculerSouhait(req, res, next) {
  try {
    await pool.query(`INSERT INTO souhaits (utilisateur_id, livre_id) VALUES ($1,$2)
      ON CONFLICT (utilisateur_id, livre_id) DO DELETE`, [req.session.utilisateur.id, req.params.livreId]);
    res.redirect(req.get('referer') || `/livres/${req.params.livreId}`);
  } catch (erreur) { next(erreur); }
}

module.exports = { historique, confirmation, facture, souhaits, basculerSouhait };
