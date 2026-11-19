const express = require('express');
const multer = require('multer');
const { estConnecte,aLeRole }=require('../middlewares/auth');
const controller=require('../controllers/adminController');

const router=express.Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:3*1024*1024},fileFilter:(req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))});
router.use(estConnecte,aLeRole('admin','libraire'));
router.get('/admin',controller.tableauDeBord);
router.get('/admin/livres',controller.listerLivres);
router.post('/admin/livres',upload.single('couverture'),controller.enregistrerLivre);
router.post('/admin/livres/:id',upload.single('couverture'),controller.modifierLivre);
router.post('/admin/livres/:id/supprimer',controller.supprimerLivre);
router.get('/admin/commandes',controller.listerCommandes);
router.post('/admin/commandes/:id/statut',controller.changerStatutCommande);
router.get('/admin/statistiques',controller.statistique);
router.get('/admin/export/ventes.csv',controller.exportCsv);
module.exports=router;
