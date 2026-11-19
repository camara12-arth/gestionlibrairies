const pool = require('../config/database');
const paiement = require('./paiement');

async function lireParametre(client, cle, defaut) {
  const resultat = await client.query('SELECT valeur FROM parametres WHERE cle=$1', [cle]);
  return resultat.rows[0] ? Number(resultat.rows[0].valeur) : defaut;
}

async function creerCommande({ panier, infos, utilisateurId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lignes = [];

    for (const article of panier) {
      const resultat = await client.query(`
        SELECT l.id, l.prix, s.quantite, s.quantite_reservee
          FROM livres l JOIN stock s ON s.livre_id=l.id
         WHERE l.id=$1 AND l.actif=TRUE
         FOR UPDATE`, [article.livreId]);
      const livre = resultat.rows[0];
      if (!livre) throw Object.assign(new Error('Un livre n’est plus disponible.'), { statusCode: 409 });
      const disponible = livre.quantite - livre.quantite_reservee;
      if (article.quantite > disponible) {
        throw Object.assign(new Error(`Stock insuffisant pour le livre ${livre.id}.`), { statusCode: 409 });
      }
      lignes.push({ livreId: livre.id, quantite: article.quantite, prix: livre.prix });
    }

    const sousTotal = lignes.reduce((total, ligne) => total + ligne.prix * ligne.quantite, 0);
    const seuilLivraison = await lireParametre(client, 'livraison_gratuite_des', 25000);
    const fraisBase = await lireParametre(client, 'livraison_bamako', 1000);
    const fraisLivraison = infos.modeLivraison === 'livraison' && sousTotal < seuilLivraison ? fraisBase : 0;
    const total = sousTotal + fraisLivraison;
    const reference = `CMD-${Date.now().toString().slice(-8)}-${Math.floor(Math.random()*900+100)}`;

    const commandeResultat = await client.query(`
      INSERT INTO commandes
      (reference, utilisateur_id, email_invite, prenom, nom, telephone, commune, quartier, adresse,
       mode_livraison, statut, sous_total, frais_livraison, total, reserve_jusqua)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'nouvelle',$11,$12,$13,NOW()+INTERVAL '3 days')
      RETURNING *`, [reference, utilisateurId || null, infos.email || null, infos.prenom, infos.nom,
      infos.telephone, infos.commune || null, infos.quartier || null, infos.adresse || null,
      infos.modeLivraison, sousTotal, fraisLivraison, total]);

    const commande = commandeResultat.rows[0];

    for (const ligne of lignes) {
      await client.query(`INSERT INTO lignes_commande (commande_id, livre_id, quantite, prix_unitaire)
                          VALUES ($1,$2,$3,$4)`, [commande.id, ligne.livreId, ligne.quantite, ligne.prix]);

      const stockResultat = await client.query('SELECT quantite, quantite_reservee FROM stock WHERE livre_id=$1 FOR UPDATE', [ligne.livreId]);
      const ancienStock = stockResultat.rows[0].quantite;
      await client.query(`UPDATE stock SET quantite=$1, modifie_le=NOW()
                          WHERE livre_id=$2`, [ancienStock - ligne.quantite, ligne.livreId]);

      await client.query(`INSERT INTO mouvements_stock
        (livre_id, utilisateur_id, type, quantite, ancien_stock, nouveau_stock, motif, reference)
        VALUES ($1,$2,'sortie',$3,$4,$4-$3,'Commande validée',$5)`,
        [ligne.livreId, utilisateurId || null, ligne.quantite, ancienStock, reference]);
    }

    await client.query(`INSERT INTO historique_statuts_commande (commande_id, ancien_statut, nouveau_statut, utilisateur_id)
                        VALUES ($1,NULL,'nouvelle',$2)`, [commande.id, utilisateurId || null]);

    const resultatPaiement = await paiement.effectuerPaiement({
      operateur: infos.paiement, telephone: infos.telephonePaiement || infos.telephone,
      montant: total, reference
    });

    await client.query(`INSERT INTO paiements
      (commande_id, operateur, statut, montant, reference)
      VALUES ($1,$2,$3,$4,$5)`, [commande.id,
      infos.paiement === 'livraison' ? 'livraison' : infos.paiement === 'retrait' ? 'retrait' : infos.paiement,
      resultatPaiement.statut, total, resultatPaiement.reference]);

    if (resultatPaiement.statut === 'simule') {
      await client.query(`UPDATE commandes SET statut='payee', modifie_le=NOW() WHERE id=$1`, [commande.id]);
      await client.query(`INSERT INTO historique_statuts_commande (commande_id, ancien_statut, nouveau_statut, utilisateur_id)
                          VALUES ($1,'nouvelle','payee',$2)`, [commande.id, utilisateurId || null]);
    }

    await client.query('COMMIT');
    return commande;
  } catch (erreur) {
    await client.query('ROLLBACK');
    throw erreur;
  } finally {
    client.release();
  }
}

async function annulerCommande(commandeId, utilisateurId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const commande = await client.query('SELECT * FROM commandes WHERE id=$1 FOR UPDATE', [commandeId]);
    if (!commande.rows[0]) throw Object.assign(new Error('Commande introuvable.'), { statusCode: 404 });
    if (['livree','retiree','annulee'].includes(commande.rows[0].statut)) {
      throw Object.assign(new Error('Cette commande ne peut plus être annulée.'), { statusCode: 409 });
    }

    const lignes = await client.query('SELECT livre_id, quantite FROM lignes_commande WHERE commande_id=$1', [commandeId]);
    for (const ligne of lignes.rows) {
      const stock = await client.query('SELECT quantite FROM stock WHERE livre_id=$1 FOR UPDATE', [ligne.livre_id]);
      const ancien = stock.rows[0].quantite;
      await client.query('UPDATE stock SET quantite=quantite+$1, quantite_reservee=GREATEST(quantite_reservee-$1,0), modifie_le=NOW() WHERE livre_id=$2', [ligne.quantite, ligne.livre_id]);
      await client.query(`INSERT INTO mouvements_stock (livre_id, utilisateur_id, type, quantite, ancien_stock, nouveau_stock, motif, reference)
                          VALUES ($1,$2,'annulation',$3,$4,$4+$3,'Annulation de commande',$5)`, [ligne.livre_id, utilisateurId, ligne.quantite, ancien, commande.rows[0].reference]);
    }

    await client.query(`UPDATE commandes SET statut='annulee', modifie_le=NOW() WHERE id=$1`, [commandeId]);
    await client.query(`INSERT INTO historique_statuts_commande (commande_id, ancien_statut, nouveau_statut, utilisateur_id)
                        VALUES ($1,$2,'annulee',$3)`, [commandeId, commande.rows[0].statut, utilisateurId]);
    await client.query(`UPDATE paiements SET statut='annule', modifie_le=NOW() WHERE commande_id=$1`, [commandeId]);
    await client.query('COMMIT');
  } catch (erreur) {
    await client.query('ROLLBACK');
    throw erreur;
  } finally {
    client.release();
  }
}

module.exports = { creerCommande, annulerCommande };
