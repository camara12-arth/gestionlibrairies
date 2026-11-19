const pool=require('../config/database');

async function auteurs(req,res,next){try{const r=await pool.query('SELECT * FROM auteurs ORDER BY nom,prenom');res.render('admin/auteurs',{titre:'Auteurs',auteurs:r.rows});}catch(e){next(e);}}
async function sauverAuteur(req,res,next){try{await pool.query(`INSERT INTO auteurs(prenom,nom,biographie) VALUES($1,$2,$3) ON CONFLICT(prenom,nom) DO UPDATE SET biographie=EXCLUDED.biographie`,[req.body.prenom,req.body.nom,req.body.biographie||null]);res.redirect('/admin/auteurs');}catch(e){next(e);}}
async function editeurs(req,res,next){try{const r=await pool.query('SELECT * FROM editeurs ORDER BY nom');res.render('admin/editeurs',{titre:'Éditeurs',editeurs:r.rows});}catch(e){next(e);}}
async function sauverEditeur(req,res,next){try{await pool.query(`INSERT INTO editeurs(nom,adresse,telephone,email) VALUES($1,$2,$3,$4) ON CONFLICT(nom) DO UPDATE SET adresse=EXCLUDED.adresse,telephone=EXCLUDED.telephone,email=EXCLUDED.email`,[req.body.nom,req.body.adresse||null,req.body.telephone||null,req.body.email||null]);res.redirect('/admin/editeurs');}catch(e){next(e);}}
async function categories(req,res,next){try{const r=await pool.query('SELECT * FROM categories ORDER BY nom');res.render('admin/categories',{titre:'Catégories',categories:r.rows});}catch(e){next(e);}}
async function sauverCategorie(req,res,next){try{await pool.query(`INSERT INTO categories(nom,slug) VALUES($1,$2) ON CONFLICT(nom) DO UPDATE SET slug=EXCLUDED.slug`,[req.body.nom,req.body.slug]);res.redirect('/admin/categories');}catch(e){next(e);}}
module.exports={auteurs,sauverAuteur,editeurs,sauverEditeur,categories,sauverCategorie};
