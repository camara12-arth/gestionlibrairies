/*
Diagramme relationnel simplifié :

mermaid
utilisateurs ||--o{ commandes : passe
livres ||--|| stock : possède
livres ||--o{ livre_auteurs : appartient
livres ||--o{ livre_categories : appartient
auteurs ||--o{ livre_auteurs : écrit
categories ||--o{ livre_categories : classe
editeurs ||--o{ livres : publie
commandes ||--|{ lignes_commande : contient
livres ||--o{ lignes_commande : ligne
commandes ||--o{ paiements : reçoit
commandes ||--o{ historique_statuts_commande : historise
stock ||--o{ mouvements_stock : trace
fournisseurs ||--o{ achats_fournisseurs : fournit
achats_fournisseurs ||--|{ lignes_achat_fournisseur : contient
utilisateurs ||--o{ ventes_comptoir : encaisse
ventes_comptoir ||--|{ lignes_vente_comptoir : contient
*/

BEGIN;

DROP TABLE IF EXISTS mouvements_stock, lignes_commande, paiements, reservations, souhaits,
  jetons_utilisateur, lignes_achat_fournisseur, achats_fournisseurs, fournisseurs,
  lignes_vente_comptoir, ventes_comptoir, historique_statuts_commande,
  lignes_commande, commandes, stock, livre_auteurs, livre_categories,
  livres, auteurs, editeurs, categories, parametres, utilisateurs CASCADE;

CREATE TABLE utilisateurs (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe_hash VARCHAR(255) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  telephone VARCHAR(30),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','libraire','client')),
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  email_verifie BOOLEAN NOT NULL DEFAULT FALSE,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jetons_utilisateur (
  id BIGSERIAL PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('verification_email','reinitialisation_mot_de_passe')),
  jeton_hash VARCHAR(255) NOT NULL UNIQUE,
  expire_le TIMESTAMPTZ NOT NULL,
  utilise_le TIMESTAMPTZ,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE parametres (
  cle VARCHAR(100) PRIMARY KEY,
  valeur VARCHAR(255) NOT NULL,
  description TEXT,
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auteurs (
  id BIGSERIAL PRIMARY KEY,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  biographie TEXT,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (prenom, nom)
);

CREATE TABLE editeurs (
  id BIGSERIAL PRIMARY KEY,
  nom VARCHAR(150) NOT NULL UNIQUE,
  adresse TEXT,
  telephone VARCHAR(30),
  email VARCHAR(255),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE livres (
  id BIGSERIAL PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  isbn VARCHAR(20) NOT NULL UNIQUE,
  resume TEXT,
  prix INTEGER NOT NULL CHECK (prix >= 0),
  couverture VARCHAR(255),
  langue VARCHAR(50) NOT NULL DEFAULT 'Français',
  nombre_pages INTEGER CHECK (nombre_pages IS NULL OR nombre_pages > 0),
  date_publication DATE,
  editeur_id BIGINT NOT NULL REFERENCES editeurs(id) ON DELETE RESTRICT,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE livre_auteurs (
  livre_id BIGINT NOT NULL REFERENCES livres(id) ON DELETE CASCADE,
  auteur_id BIGINT NOT NULL REFERENCES auteurs(id) ON DELETE CASCADE,
  PRIMARY KEY (livre_id, auteur_id)
);

CREATE TABLE livre_categories (
  livre_id BIGINT NOT NULL REFERENCES livres(id) ON DELETE CASCADE,
  categorie_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (livre_id, categorie_id)
);

CREATE TABLE stock (
  livre_id BIGINT PRIMARY KEY REFERENCES livres(id) ON DELETE CASCADE,
  quantite INTEGER NOT NULL DEFAULT 0 CHECK (quantite >= 0),
  quantite_reservee INTEGER NOT NULL DEFAULT 0 CHECK (quantite_reservee >= 0),
  seuil_alerte INTEGER NOT NULL DEFAULT 3 CHECK (seuil_alerte >= 0),
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (quantite_reservee <= quantite)
);

CREATE TABLE mouvements_stock (
  id BIGSERIAL PRIMARY KEY,
  livre_id BIGINT NOT NULL REFERENCES livres(id) ON DELETE RESTRICT,
  utilisateur_id BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('entree','sortie','reservation','liberation','annulation','vente','inventaire')),
  quantite INTEGER NOT NULL CHECK (quantite > 0),
  ancien_stock INTEGER NOT NULL CHECK (ancien_stock >= 0),
  nouveau_stock INTEGER NOT NULL CHECK (nouveau_stock >= 0),
  motif VARCHAR(255) NOT NULL,
  reference VARCHAR(100),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE souhaits (
  utilisateur_id BIGINT NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  livre_id BIGINT NOT NULL REFERENCES livres(id) ON DELETE CASCADE,
  ajoute_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (utilisateur_id, livre_id)
);

CREATE TABLE commandes (
  id BIGSERIAL PRIMARY KEY,
  reference VARCHAR(30) NOT NULL UNIQUE,
  utilisateur_id BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
  email_invite VARCHAR(255),
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  telephone VARCHAR(30) NOT NULL,
  commune VARCHAR(100),
  quartier VARCHAR(100),
  adresse TEXT,
  mode_livraison VARCHAR(20) NOT NULL CHECK (mode_livraison IN ('livraison','retrait')),
  statut VARCHAR(20) NOT NULL DEFAULT 'nouvelle' CHECK (statut IN ('nouvelle','payee','preparee','livree','retiree','annulee')),
  sous_total INTEGER NOT NULL CHECK (sous_total >= 0),
  frais_livraison INTEGER NOT NULL DEFAULT 0 CHECK (frais_livraison >= 0),
  total INTEGER NOT NULL CHECK (total >= 0),
  reserve_jusqua TIMESTAMPTZ,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lignes_commande (
  id BIGSERIAL PRIMARY KEY,
  commande_id BIGINT NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  livre_id BIGINT NOT NULL REFERENCES livres(id) ON DELETE RESTRICT,
  quantite INTEGER NOT NULL CHECK (quantite > 0),
  prix_unitaire INTEGER NOT NULL CHECK (prix_unitaire >= 0),
  UNIQUE (commande_id, livre_id)
);

CREATE TABLE historique_statuts_commande (
  id BIGSERIAL PRIMARY KEY,
  commande_id BIGINT NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  ancien_statut VARCHAR(20),
  nouveau_statut VARCHAR(20) NOT NULL,
  utilisateur_id BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE paiements (
  id BIGSERIAL PRIMARY KEY,
  commande_id BIGINT NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  operateur VARCHAR(20) NOT NULL CHECK (operateur IN ('orange','moov','livraison','retrait','especes')),
  statut VARCHAR(20) NOT NULL CHECK (statut IN ('en_attente','simule','confirme','echoue','annule')),
  montant INTEGER NOT NULL CHECK (montant >= 0),
  reference VARCHAR(100),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reservations (
  id BIGSERIAL PRIMARY KEY,
  utilisateur_id BIGINT REFERENCES utilisateurs(id) ON DELETE CASCADE,
  livre_id BIGINT NOT NULL REFERENCES livres(id) ON DELETE CASCADE,
  quantite INTEGER NOT NULL CHECK (quantite > 0),
  expire_le TIMESTAMPTZ NOT NULL,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fournisseurs (
  id BIGSERIAL PRIMARY KEY,
  nom VARCHAR(150) NOT NULL UNIQUE,
  contact VARCHAR(150),
  telephone VARCHAR(30),
  email VARCHAR(255),
  adresse TEXT,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE achats_fournisseurs (
  id BIGSERIAL PRIMARY KEY,
  reference VARCHAR(30) NOT NULL UNIQUE,
  fournisseur_id BIGINT NOT NULL REFERENCES fournisseurs(id) ON DELETE RESTRICT,
  utilisateur_id BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon','commande','partiellement_recu','recu','annule')),
  total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recu_le TIMESTAMPTZ
);

CREATE TABLE lignes_achat_fournisseur (
  id BIGSERIAL PRIMARY KEY,
  achat_id BIGINT NOT NULL REFERENCES achats_fournisseurs(id) ON DELETE CASCADE,
  livre_id BIGINT NOT NULL REFERENCES livres(id) ON DELETE RESTRICT,
  quantite_commandee INTEGER NOT NULL CHECK (quantite_commandee > 0),
  quantite_recue INTEGER NOT NULL DEFAULT 0 CHECK (quantite_recue >= 0),
  prix_unitaire INTEGER NOT NULL CHECK (prix_unitaire >= 0),
  UNIQUE (achat_id, livre_id),
  CHECK (quantite_recue <= quantite_commandee)
);

CREATE TABLE ventes_comptoir (
  id BIGSERIAL PRIMARY KEY,
  reference VARCHAR(30) NOT NULL UNIQUE,
  utilisateur_id BIGINT NOT NULL REFERENCES utilisateurs(id) ON DELETE RESTRICT,
  sous_total INTEGER NOT NULL CHECK (sous_total >= 0),
  total INTEGER NOT NULL CHECK (total >= 0),
  moyen_paiement VARCHAR(20) NOT NULL CHECK (moyen_paiement IN ('especes','orange','moov','carte')),
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lignes_vente_comptoir (
  id BIGSERIAL PRIMARY KEY,
  vente_id BIGINT NOT NULL REFERENCES ventes_comptoir(id) ON DELETE CASCADE,
  livre_id BIGINT NOT NULL REFERENCES livres(id) ON DELETE RESTRICT,
  quantite INTEGER NOT NULL CHECK (quantite > 0),
  prix_unitaire INTEGER NOT NULL CHECK (prix_unitaire >= 0)
);

CREATE INDEX idx_livres_titre ON livres USING GIN (to_tsvector('french', titre));
CREATE INDEX idx_livres_isbn ON livres(isbn);
CREATE INDEX idx_livre_categories_categorie ON livre_categories(categorie_id);
CREATE INDEX idx_commandes_statut ON commandes(statut);
CREATE INDEX idx_commandes_reference ON commandes(reference);
CREATE INDEX idx_mouvements_stock_livre ON mouvements_stock(livre_id, cree_le DESC);
CREATE INDEX idx_utilisateurs_email ON utilisateurs(email);
CREATE INDEX idx_achats_statut ON achats_fournisseurs(statut);

COMMIT;
