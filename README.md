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
