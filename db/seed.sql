BEGIN;

TRUNCATE TABLE
  mouvements_stock, lignes_commande, paiements, reservations, souhaits, jetons_utilisateur,
  lignes_achat_fournisseur, achats_fournisseurs, fournisseurs,
  historique_statuts_commande, lignes_vente_comptoir, ventes_comptoir,
  commandes, stock, livre_auteurs, livre_categories,
  livres, auteurs, editeurs, categories, parametres, utilisateurs
RESTART IDENTITY CASCADE;

INSERT INTO utilisateurs (email, mot_de_passe_hash, prenom, nom, telephone, role, actif, email_verifie) VALUES
('admin@librairie.ml', '$2b$10$63MbUGdbGajrbNR7aVP/OeDnmfCSsYjWTgyGNS8sZidVUh8ErAk6C', 'Mariam', 'Koné', '+22370000001', 'admin', TRUE, TRUE),
('libraire@librairie.ml', '$2b$10$63MbUGdbGajrbNR7aVP/OeDnmfCSsYjWTgyGNS8sZidVUh8ErAk6C', 'Ibrahim', 'Diallo', '+22370000002', 'libraire', TRUE, TRUE),
('amina.diarra@example.ml', '$2b$10$63MbUGdbGajrbNR7aVP/OeDnmfCSsYjWTgyGNS8sZidVUh8ErAk6C', 'Amina', 'Diarra', '+22370000003', 'client', TRUE, TRUE),
('moussa.sangare@example.ml', '$2b$10$63MbUGdbGajrbNR7aVP/OeDnmfCSsYjWTgyGNS8sZidVUh8ErAk6C', 'Moussa', 'Sangaré', '+22370000004', 'client', TRUE, TRUE);

INSERT INTO parametres (cle, valeur, description) VALUES
('livraison_bamako', '1000', 'Frais de livraison à Bamako en FCFA'),
('livraison_gratuite_des', '25000', 'Montant d’achat à partir duquel la livraison est gratuite'),
('reservation_panier_minutes', '15', 'Durée de réservation du panier en minutes'),
('reservation_retrait_jours', '3', 'Durée de réservation pour le retrait en magasin');

INSERT INTO categories (nom, slug) VALUES
('Littérature africaine','litterature-africaine'),
('Roman','roman'),
('Jeunesse','jeunesse'),
('Essai','essai'),
('Pédagogie','pedagogie'),
('Bande dessinée','bande-dessinee');

INSERT INTO auteurs (prenom, nom, biographie) VALUES
('Ahmadou','Kourouma','Écrivain ivoirien, voix majeure de la littérature africaine.'),
('Mariama','Bâ','Romancière sénégalaise.'),
('Amadou Hampâté','Bâ','Écrivain, historien et ethnologue malien.'),
('Camara','Laye','Écrivain guinéen.'),
('Fatou','Diome','Romancière sénégalaise vivant en France.'),
('Moussa','Konaté','Écrivain et éditeur malien.'),
('Mohamed','Mbougar Sarr','Écrivain sénégalais.'),
('Sami','Tchak','Romancier togolais.'),
('Kidi','Bambara','Auteure américaine engagée.'),
('Tierno','Monénembo','Romancier guinéen.');

INSERT INTO editeurs (nom, adresse, telephone, email) VALUES
('Présence Africaine','Paris, France','+33100000000','contact@presenceafricaine.fr'),
('NENA','Bamako, Mali','+22320200001','contact@nena.ml'),
('Gallimard','Paris, France','+33100000001','contact@gallimard.fr'),
('Actes Sud','Arles, France','+33400000001','contact@actes-sud.fr');

INSERT INTO livres (titre, isbn, resume, prix, couverture, langue, nombre_pages, date_publication, editeur_id) VALUES
('Les Soleils des indépendances','9780000000001','Roman majeur sur les mutations sociales de l’Afrique indépendante.',5500,'soleils-independances.jpg','Français',240,'1968-01-01',1),
('Une si longue lettre','9780000000002','Une correspondance intime sur la condition des femmes.',4500,'une-si-longue-lettre.jpg','Français',160,'1980-01-01',1),
('L’Enfant noir','9780000000003','Le récit initiatique d’une enfance en Guinée.',4000,'enfant-noir.jpg','Français',180,'1953-01-01',1),
('Amkoullel l’enfant peul','9780000000004','Souvenirs et traditions du jeune Amadou Hampâté Bâ.',6000,'amkoullel.jpg','Français',300,'1991-01-01',2),
('La Vocation de Sangomar','9780000000005','Chronique africaine entre mémoire, société et modernité.',5000,'sangomar.jpg','Français',220,'2019-01-01',2),
('Le Baobab fou','9780000000006','Roman métissé mêlant identité, Afrique et diaspora.',4800,'baobab-fou.jpg','Français',190,'2005-01-01',1),
('La Petite Royauté','9780000000007','Une intrigue policière sahélienne pleine de suspense.',5200,'petite-royaute.jpg','Français',210,'2015-01-01',2),
('La Plus Secrète mémoire des hommes','9780000000008','À la recherche d’un auteur mystérieux et disparu.',7500,'memoire-hommes.jpg','Français',450,'2021-01-01',3),
('Le Crime de la rue des Notaires','9780000000009','Roman urbain africain autour d’un meurtre inattendu.',5800,'crime-notaires.jpg','Français',280,'2012-01-01',4),
('De pierre et d’os','9780000000010','Roman contemporain qui pose la question de l’identité.',6500,'pierre-et-os.jpg','Français',320,'2018-01-01',4),
('Les Écailles du ciel','9780000000011','Récit poétique sur les liens entre générations.',4700,'ecailles-ciel.jpg','Français',200,'2016-01-01',2),
('Mali, une histoire africaine','9780000000012','Essai accessible sur l’histoire et les cultures du Mali.',8000,'histoire-mali.jpg','Français',350,'2020-01-01',2),
('Bamako au quotidien','9780000000013','Portraits et récits de la vie bamakoise.',3500,'bamako-quotidien.jpg','Français',140,'2018-01-01',2),
('Le Petit Prince du Niger','9780000000014','Aventure jeunesse inspirée des fleuves d’Afrique de l’Ouest.',3000,'petit-prince-niger.jpg','Français',96,'2022-01-01',2),
('Contes du Sahel','9780000000015','Douze contes traditionnels pour la jeunesse.',2500,'contes-sahel.jpg','Français',112,'2017-01-01',2),
('L’École des vivants','9780000000016','Roman jeunesse sur l’apprentissage et le courage.',3200,'ecole-vivants.jpg','Français',128,'2021-01-01',3),
('Grammaire pratique du français','9780000000017','Outil pédagogique pour apprendre les bases du français.',6500,'grammaire-pratique.jpg','Français',260,'2019-01-01',2),
('Mathématiques 6e','9780000000018','Exercices et cours conformes aux programmes francophones.',7000,'mathematiques-6e.jpg','Français',290,'2023-01-01',2),
('Histoire-géographie 5e','9780000000019','Manuel illustré d’histoire-géographie.',6900,'histoire-geo-5e.jpg','Français',270,'2023-01-01',2),
('Bamak’Aventures, tome 1','9780000000020','Bande dessinée humoristique dans les rues de Bamako.',2800,'bamakaventures-1.jpg','Français',64,'2022-01-01',2),
('L’An 2 de la République','9780000000021','Essai politique sur la démocratie et les institutions.',7200,'an-2-republique.jpg','Français',240,'2019-01-01',4),
('Regards sur le monde','9780000000022','Chroniques géopolitiques accessibles.',5400,'regards-monde.jpg','Français',210,'2020-01-01',4),
('La Femme de Zongo','9780000000023','Roman contemporain sur une famille à Bamako.',4900,'femme-zongo.jpg','Français',180,'2016-01-01',2),
('Nuit de février','9780000000024','Recueil poétique consacré aux saisons du Sahel.',3800,'nuit-fevrier.jpg','Français',130,'2018-01-01',1),
('Les Aventuriers du Dyarra','9780000000025','Jeunes héros explorant leur quartier et ses secrets.',3400,'aventuriers-dyarra.jpg','Français',150,'2024-01-01',2),
('Le Gouverneur des marges','9780000000026','Satire africaine sur le pouvoir local.',6200,'gouverneur-marges.jpg','Français',300,'2013-01-01',3),
('Alphabet du monde','9780000000027','Livre jeunesse bilingue pour découvrir les mots.',2700,'alphabet-monde.jpg','Français',80,'2023-01-01',2),
('Terres de sable','9780000000028','Roman entre désert, ville et traditions.',5300,'terres-sable.jpg','Français',260,'2015-01-01',4),
('Le Professeur Bambara','9780000000029','Histoire pédagogique sur l’envie d’apprendre.',3600,'professeur-bambara.jpg','Français',170,'2021-01-01',2),
('Carnet de voyage à Mopti','9780000000030','Carnet illustré des bords du Niger.',4200,'mopti-voyage.jpg','Français',120,'2022-01-01',2);

INSERT INTO livre_auteurs (livre_id, auteur_id)
SELECT id, CASE ((id - 1) % 10) + 1 FROM livres;

INSERT INTO livre_categories (livre_id, categorie_id)
SELECT id,
  CASE
    WHEN id BETWEEN 14 AND 16 OR id IN (25,27) THEN 3
    WHEN id BETWEEN 17 AND 19 OR id = 29 THEN 5
    WHEN id = 20 THEN 6
    WHEN id IN (12,21,22) THEN 4
    WHEN id <= 11 THEN 1
    ELSE 2
  END
FROM livres;

INSERT INTO stock (livre_id, quantite, quantite_reservee, seuil_alerte)
SELECT id, 3 + ((id * 7) % 18), 0, 3 + (id % 4) FROM livres;

INSERT INTO fournisseurs (nom, contact, telephone, email, adresse) VALUES
('Fournisseur Scolaire Bamako','Awa Traoré','+22370010001','scolaire@example.ml','Bamako, Mali'),
('Diffusion Francophone Afrique','Jean Coulibaly','+22370010002','diffusion@example.ml','Bamako, Mali'),
('Éditions du Fleuve','Sekou Keita','+22370010003','editions@example.ml','Ségou, Mali');

COMMIT;
