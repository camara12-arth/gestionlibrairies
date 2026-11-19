const pool = require('../config/database');
const sharp = require('sharp');

async function tableauDeBord(req, res, next) {
  try {
    const [jour, mois, commandes, alertes] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(total),0) AS total FROM ventes_comptoir WHERE cree_le>=date_trunc('day',NOW())"),
      pool.query("SELECT COALESCE(SUM(total),0) AS total FROM ventes_comptoir WHERE cree_le>=date_trunc('month',NOW())"),
      pool.query("SELECT COUNT(*) AS total FROM commandes WHERE statut NOT IN ('livree','retiree','annulee')"),
      pool.query(`SELECT l.id,l.titre,s.quantite,s.seuil_alerte FROM livres l JOIN stock s ON s.livre_id=l.id
                  WHERE s.quantite-s.quantite_reservee<=s.seuil_alerte ORDER BY s.quantite-s.quantite_reservee,l.titre`)
    ]);
    res.render('admin/tableau-bord', {
      titre:'Tableau de bord', ventesJour:Number(jour.rows[0].total), ventesMois:Number(mois.rows[0].total),
      commandesANaitre:Number(commandes.rows[0].total), alertes:alertes.rows
    });
  } catch (erreur) { next(erreur); }
}

async function listerLivres(req, res, next) {
  try {
    const livres = await pool.query(`SELECT l.*,s.quantite,s.seuil_alerte,e.nom AS editeur_nom
      FROM livres l LEFT JOIN stock s ON s.livre_id=l.id LEFT JOIN editeurs e ON e.id=l.editeur_id
      ORDER BY l.titre LIMIT 100`);
    res.render('admin/livres/liste', { titre:'Livres', livres:livres.rows });
  } catch (erreur) { next(erreur); }
}

async function enregistrerLivre(req, res, next) {
  try {
    let couverture = null;
    if (req.file) {
      couverture = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      await sharp(req.file.buffer).resize(800, 1200, { fit:'inside', withoutEnlargement:true }).webp({ quality:78 }).toFile(`src/public/couvertures/${couverture}`);
    }
    const { titre,isbn,resume,prix,editeur_id,langue,nombre_pages,auteurs,categories,quantite,seuil_alerte } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const livre = await client.query(`INSERT INTO livres(titre,isbn,resume,prix,couverture,editeur_id,langue,nombre_pages)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [titre,isbn,resume||null,Number(prix),couverture,Number(editeur_id),langue||'Français',nombre_pages?Number(nombre_pages):null]);
      await client.query('INSERT INTO stock(livre_id,quantite,seuil_alerte) VALUES($1,$2,$3)', [livre.rows[0].id,Number(quantite||0),Number(seuil_alerte||3)]);
      for (const auteurId of String(auteurs||'').split(',').map(Number).filter(Boolean)) await client.query('INSERT INTO livre_auteurs(livre_id,auteur_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[livre.rows[0].id,auteurId]);
      for (const categorieId of String(categories||'').split(',').map(Number).filter(Boolean)) await client.query('INSERT INTO livre_categories(livre_id,categorie_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[livre.rows[0].id,categorieId]);
      await client.query('COMMIT');
      res.redirect('/admin/livres');
    } catch (erreur) { await client.query('ROLLBACK'); throw erreur; } finally { client.release(); }
  } catch (erreur) { next(erreur); }
}

async function modifierLivre(req, res, next) {
  try {
    const valeurs = [req.body.titre,req.body.isbn,req.body.resume||null,Number(req.body.prix),Number(req.body.editeur_id),req.params.id];
    if (req.file) {
      const couverture = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      await sharp(req.file.buffer).resize(800,1200,{ fit:'inside',withoutEnlargement:true }).webp({quality:78}).toFile(`src/public/couvertures/${couverture}`);
      valeurs.splice(5,0,couverture);
    }
    const sql = req.file
      ? `UPDATE livres SET titre=$1,isbn=$2,resume=$3,prix=$4,editeur_id=$5,couverture=$6 WHERE id=$7`
      : `UPDATE livres SET titre=$1,isbn=$2,resume=$3,prix=$4,editeur_id=$5 WHERE id=$6`;
    await pool.query(sql,valeurs);
    await pool.query('UPDATE stock SET quantite=$1,seuil_alerte=$2,modifie_le=NOW() WHERE livre_id=$3',[Number(req.body.quantite||0),Number(req.body.seuil_alerte||3),req.params.id]);
    res.redirect('/admin/livres');
  } catch (erreur) { next(erreur); }
}

async function supprimerLivre(req, res, next) {
  try { await pool.query('UPDATE livres SET actif=FALSE,modifie_le=NOW() WHERE id=$1',[req.params.id]); res.redirect('/admin/livres'); }
  catch (erreur) { next(erreur); }
}

async function listerCommandes(req,res,next) {
  try {
    const result=await pool.query('SELECT * FROM commandes ORDER BY cree_le DESC LIMIT 200');
    res.render('admin/commandes/liste',{ titre:'Commandes', commandes:result.rows });
  } catch(erreur){next(erreur);}
}

async function changerStatutCommande(req,res,next) {
  try {
    const allowed=['nouvelle','payee','preparee','livree','retiree','annulee'];
    if(!allowed.includes(req.body.statut)) throw Object.assign(new Error('Statut invalide'),{statusCode:422});
    if(req.body.statut==='annulee') {
      const { annulerCommande }=require('../services/commandeService');
      await annulerCommande(req.params.id,req.session.utilisateur.id);
    } else {
      const ancien=await pool.query('SELECT statut FROM commandes WHERE id=$1',[req.params.id]);
      await pool.query('UPDATE commandes SET statut=$1,modifie_le=NOW() WHERE id=$2',[req.body.statut,req.params.id]);
      await pool.query('INSERT INTO historique_statuts_commande(commande_id,ancien_statut,nouveau_statut,utilisateur_id) VALUES($1,$2,$3,$4)',[req.params.id,ancien.rows[0]?.statut,req.body.statut,req.session.utilisateur.id]);
    }
    res.redirect('/admin/commandes');
  } catch(erreur){next(erreur);}
}

async function statistique(req,res,next) {
  try {
    const meilleures=await pool.query(`SELECT l.titre,SUM(lc.quantite) AS ventes FROM lignes_commande lc JOIN livres l ON l.id=lc.livre_id JOIN commandes c ON c.id=lc.commande_id
      WHERE c.statut<> 'annulee' GROUP BY l.id,l.titre ORDER BY ventes DESC LIMIT 10`);
    const periode=await pool.query(`SELECT date_trunc('day',cree_le) AS jour,SUM(total) AS ventes FROM commandes WHERE statut<> 'annulee' AND cree_le>=NOW()-INTERVAL '30 days' GROUP BY 1 ORDER BY 1`);
    res.render('admin/statistiques',{ titre:'Statistiques', meilleures:meilleures.rows, periode:periode.rows });
  } catch(erreur){next(erreur);}
}

async function exportCsv(req,res,next) {
  try {
    const resultat=await pool.query(`SELECT c.reference,c.cree_le,c.statut,c.sous_total,c.frais_livraison,c.total FROM commandes c ORDER BY c.cree_le DESC`);
    const stringify=require('csv-stringify/sync').stringify;
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="ventes.csv"');
    res.send(stringify(resultat.rows,{header:true,columns:['reference','cree_le','statut','sous_total','frais_livraison','total']}));
  } catch(erreur){next(erreur);}
}

module.exports={ tableauDeBord,listerLivres,enregistrerLivre,modifierLivre,supprimerLivre,listerCommandes,changerStatutCommande,statistique,exportCsv };
