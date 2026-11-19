const pool=require('../config/database');

async function vente(req,res,next){try{res.render('admin/comptoir',{titre:'Vente au comptoir',livres:(await pool.query(`SELECT l.id,l.titre,l.prix,GREATEST(s.quantite-s.quantite_reservee,0) AS disponible FROM livres l JOIN stock s ON s.livre_id=l.id WHERE l.actif=TRUE ORDER BY l.titre`)).rows});}catch(erreur){next(erreur);}}
async function enregistrerVente(req,res,next){const client=await pool.connect();try{await client.query('BEGIN');const ids=Array.isArray(req.body.livre_id)?req.body.livre_id:[req.body.livre_id];const quantites=Array.isArray(req.body.quantite)?req.body.quantite:[req.body.quantite];let sousTotal=0;const lignes=[];for(let i=0;i<ids.length;i++){const quantite=Number(quantites[i]);const r=await client.query('SELECT l.prix,s.quantite,s.quantite_reservee FROM livres l JOIN stock s ON s.livre_id=l.id WHERE l.id=$1 FOR UPDATE',[Number(ids[i])]);if(!r.rows[0]||quantite<1||quantite>r.rows[0].quantite-r.rows[0].quantite_reservee)throw Object.assign(new Error('Stock insuffisant ou livre introuvable'),{statusCode:409});const ancien=r.rows[0].quantite;sousTotal+=r.rows[0].prix*quantite;lignes.push({livreId:Number(ids[i]),quantite,prix:r.rows[0].prix,ancien});}const reference=`VT-${Date.now().toString().slice(-8)}`;const vente=await client.query('INSERT INTO ventes_comptoir(reference,utilisateur_id,sous_total,total,moyen_paiement) VALUES($1,$2,$3,$3,$4) RETURNING id',[reference,req.session.utilisateur.id,sousTotal,req.body.moyen_paiement]);for(const ligne of lignes){await client.query('INSERT INTO lignes_vente_comptoir(vente_id,livre_id,quantite,prix_unitaire) VALUES($1,$2,$3,$4)',[vente.rows[0].id,ligne.livreId,ligne.quantite,ligne.prix]);await client.query('UPDATE stock SET quantite=quantite-$1,modifie_le=NOW() WHERE livre_id=$2',[ligne.quantite,ligne.livreId]);await client.query(`INSERT INTO mouvements_stock(livre_id,utilisateur_id,type,quantite,ancien_stock,nouveau_stock,motif,reference) VALUES($1,$2,'vente',$3,$4,$4-$3,'Vente au comptoir',$5)`,[ligne.livreId,req.session.utilisateur.id,ligne.quantite,ligne.ancien,reference]);}await client.query('COMMIT');res.redirect(`/admin/comptoir/ticket/${vente.rows[0].id}`);}catch(erreur){await client.query('ROLLBACK');next(erreur);}finally{client.release();}}
async function ticket(req,res,next){try{const vente=await pool.query('SELECT * FROM ventes_comptoir WHERE id=$1',[req.params.id]);const lignes=await pool.query('SELECT lv.*,l.titre FROM lignes_vente_comptoir lv JOIN livres l ON l.id=lv.livre_id WHERE lv.vente_id=$1',[req.params.id]);if(!vente.rows[0])return res.status(404).render('404',{titre:'Ticket introuvable',chemin:req.originalUrl});res.render('admin/ticket',{titre:'Ticket de caisse',vente:vente.rows[0],lignes:lignes.rows});}catch(erreur){next(erreur);}}

async function fournisseurs(req,res,next){try{const result=await pool.query('SELECT * FROM fournisseurs ORDER BY nom');res.render('admin/fournisseurs',{titre:'Fournisseurs',fournisseurs:result.rows});}catch(erreur){next(erreur);}}
async function sauverFournisseur(req,res,next){try{await pool.query(`INSERT INTO fournisseurs(nom,contact,telephone,email,adresse) VALUES($1,$2,$3,$4,$5) ON CONFLICT(nom) DO UPDATE SET contact=EXCLUDED.contact,telephone=EXCLUDED.telephone,email=EXCLUDED.email,adresse=EXCLUDED.adresse`,[req.body.nom,req.body.contact||null,req.body.telephone||null,req.body.email||null,req.body.adresse||null]);res.redirect('/admin/fournisseurs');}catch(erreur){next(erreur);}}
async function achats(req,res,next){try{const result=await pool.query(`SELECT a.*,f.nom AS fournisseur_nom FROM achats_fournisseurs a JOIN fournisseurs f ON f.id=a.fournisseur_id ORDER BY a.cree_le DESC`);res.render('admin/achats',{titre:'Bons de commande',achats:result.rows,fournisseurs:(await pool.query('SELECT * FROM fournisseurs WHERE actif=TRUE ORDER BY nom')).rows,livres:(await pool.query('SELECT id,titre FROM livres WHERE actif=TRUE ORDER BY titre')).rows});}catch(erreur){next(erreur);}}
async function creerAchat(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reference = `ACH-${Date.now().toString().slice(-8)}`;
    const achat = await client.query(
      'INSERT INTO achats_fournisseurs(reference,fournisseur_id,utilisateur_id,statut,total) VALUES($1,$2,$3,$4,0) RETURNING id',
      [reference, Number(req.body.fournisseur_id), req.session.utilisateur.id, 'brouillon']
    );
    const ids = Array.isArray(req.body.livre_id) ? req.body.livre_id : [req.body.livre_id];
    const quantites = Array.isArray(req.body.quantite) ? req.body.quantite : [req.body.quantite];
    const prix = Array.isArray(req.body.prix) ? req.body.prix : [req.body.prix];
    let total = 0;

    for (let i = 0; i < ids.length; i += 1) {
      const quantite = Number(quantites[i]);
      const prixUnitaire = Number(prix[i]);
      if (quantite > 0 && prixUnitaire >= 0) {
        await client.query(
          'INSERT INTO lignes_achat_fournisseur(achat_id,livre_id,quantite_commandee,quantite_recue,prix_unitaire) VALUES($1,$2,$3,0,$4)',
          [achat.rows[0].id, Number(ids[i]), quantite, prixUnitaire]
        );
        total += quantite * prixUnitaire;
      }
    }

    await client.query('UPDATE achats_fournisseurs SET total=$1,statut=$2 WHERE id=$3', [total, 'commande', achat.rows[0].id]);
    await client.query('COMMIT');
    res.redirect('/admin/achats');
  } catch (erreur) {
    await client.query('ROLLBACK');
    next(erreur);
  } finally {
    client.release();
  }
}
async function recevoirAchat(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lignes = await client.query('SELECT * FROM lignes_achat_fournisseur WHERE achat_id=$1', [req.params.id]);
    let toutRecu = true;

    for (const ligne of lignes.rows) {
      const quantite = Number(req.body[`quantite_${ligne.id}`] || 0);
      if (quantite < 0 || ligne.quantite_recue + quantite > ligne.quantite_commandee) {
        throw Object.assign(new Error('Quantité reçue invalide'), { statusCode: 422 });
      }

      if (quantite > 0) {
        const stock = await client.query('SELECT quantite FROM stock WHERE livre_id=$1 FOR UPDATE', [ligne.livre_id]);
        const ancien = stock.rows[0].quantite;
        await client.query('UPDATE stock SET quantite=quantite+$1,modifie_le=NOW() WHERE livre_id=$2', [quantite, ligne.livre_id]);
        await client.query(
          `INSERT INTO mouvements_stock(livre_id,utilisateur_id,type,quantite,ancien_stock,nouveau_stock,motif,reference)
           VALUES($1,$2,'entree',$3,$4,$4+$3,'Réception fournisseur',$5)`,
          [ligne.livre_id, req.session.utilisateur.id, quantite, ancien, req.params.id]
        );
        await client.query('UPDATE lignes_achat_fournisseur SET quantite_recue=quantite_recue+$1 WHERE id=$2', [quantite, ligne.id]);
      }

      if (ligne.quantite_recue + quantite < ligne.quantite_commandee) toutRecu = false;
    }

    await client.query(
      `UPDATE achats_fournisseurs
          SET statut=$1,recu_le=CASE WHEN $1='recu' THEN NOW() ELSE recu_le END
        WHERE id=$2`,
      [toutRecu ? 'recu' : 'partiellement_recu', req.params.id]
    );
    await client.query('COMMIT');
    res.redirect('/admin/achats');
  } catch (erreur) {
    await client.query('ROLLBACK');
    next(erreur);
  } finally {
    client.release();
  }
}

async function utilisateurs(req,res,next){try{const r=await pool.query('SELECT id,email,prenom,nom,telephone,role,actif,email_verifie,cree_le FROM utilisateurs ORDER BY nom,prenom');res.render('admin/utilisateurs',{titre:'Utilisateurs',utilisateurs:r.rows});}catch(erreur){next(erreur);}}
async function modifierUtilisateur(req,res,next){try{if(!['admin','libraire','client'].includes(req.body.role))throw Object.assign(new Error('Rôle invalide'),{statusCode:422});await pool.query('UPDATE utilisateurs SET role=$1,actif=$2,modifie_le=NOW() WHERE id=$3',[req.body.role,req.body.actif==='1',req.params.id]);res.redirect('/admin/utilisateurs');}catch(erreur){next(erreur);}}

module.exports={vente,enregistrerVente,ticket,fournisseurs,sauverFournisseur,achats,creerAchat,recevoirAchat,utilisateurs,modifierUtilisateur};
