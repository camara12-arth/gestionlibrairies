# Gestion de librairie

Base Express/EJS/PostgreSQL de la première version de la librairie.

## Prérequis

- Node.js 20 ou supérieur
- PostgreSQL 14 ou supérieur
- npm

## Installation

```powershell
npm install
Copy-Item .env.example .env
```

Configurez les variables PostgreSQL dans `.env`, puis créez la base :

```powershell
npm run db:create
npm run db:init
npm run dev
```

Ajoutez PostgreSQL au `PATH` si `createdb` ou `psql` n'est pas reconnu.

## Vérification

```powershell
curl http://localhost:3000/sante
npm test
npm run lint
```

## Vitrine et commandes

- Catalogue paginé, recherche PostgreSQL et filtres
- Panier en session avec livraison Bamako ou retrait
- Paiement mobile simulé Orange/Moov
- Transaction de commande avec décrément du stock
- Annulation avec remise intégrale des quantités
- Historique client, liste de souhaits et facture PDF

## Authentification

- Inscription et vérification e-mail
- Connexion avec sessions PostgreSQL
- Récupération du mot de passe
- Limitation des tentatives de connexion
- Protection CSRF avec jetons double-submit
- Rôles : `admin`, `libraire`, `client`

## Comptes de test

Après exécution de `db/seed.sql` :

- Administrateur : `admin@librairie.ml` / `Livre2026!`
- Libraire : `libraire@librairie.ml` / `Livre2026!`
- Client : `amina.diarra@example.ml` / `Livre2026!`
- Client : `moussa.sangare@example.ml` / `Livre2026!`

## Déploiement VPS

1. Installer Node.js 20+, PostgreSQL, Nginx, PM2 et Certbot.
2. Copier le projet dans `/var/www/gestion-librairie`.
3. Copier `.env.example` vers `.env` et renseigner les secrets de production.
4. Initialiser PostgreSQL avec `npm run db:init`.
5. Installer les dépendances : `npm install --omit=dev`.
6. Copier `deploy/nginx.conf.example` vers `/etc/nginx/sites-available/gestion-librairie` puis activer le site.
7. Configurer HTTPS : `sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com`.
8. Démarrer avec `pm2 start ecosystem.config.js --env production`.
9. Activer le démarrage PM2 : `pm2 save && pm2 startup`.
10. Planifier `scripts/backup-db.sh` quotidiennement avec cron : `0 2 * * * /var/www/gestion-librairie/scripts/backup-db.sh`.

Exemple de sauvegarde restaurable :

```bash
export PGPASSWORD='mot-de-passe-postgres'
gzip -d -c /var/backups/gestion-librairie/gestion_librairie-AAAAMMJJ-HHMMSS.sql.gz | psql -h localhost -U postgres -d gestion_librairie
```

Le script conserve 30 jours de sauvegardes par défaut via `BACKUP_RETENTION_DAYS`.

## Structure

- `src/config` : PostgreSQL et sessions
- `src/routes` : routes Express
- `src/controllers` : gestion des requêtes
- `src/services` : règles métier
- `src/models` : accès aux données
- `src/middlewares` : authentification, rôles et erreurs
- `src/views` : vues EJS
- `src/public` : CSS, JavaScript et couvertures
- `db` : schéma et données initiales
