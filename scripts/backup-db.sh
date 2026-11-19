#!/usr/bin/env bash
set -euo pipefail

# Sauvegarde quotidienne PostgreSQL de la librairie.
DOSSIER_SAUVEGARDE="${BACKUP_DIR:-/var/backups/gestion-librairie}"
NOM_BASE="${DB_NAME:-gestion_librairie}"
UTILISATEUR="${DB_USER:-postgres}"
SERVEUR="${DB_HOST:-localhost}"
PORT="${DB_PORT:-5432}"
RETENTION_JOURS="${BACKUP_RETENTION_DAYS:-30}"

mkdir -p "$DOSSIER_SAUVEGARDE"
NOM_FICHIER="${NOM_BASE}-$(date +%Y%m%d-%H%M%S).sql.gz"

PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
  --host="$SERVEUR" \
  --port="$PORT" \
  --username="$UTILISATEUR" \
  --format=plain \
  --clean \
  --if-exists \
  --file=- "$NOM_BASE" | gzip > "$DOSSIER_SAUVEGARDE/$NOM_FICHIER"

find "$DOSSIER_SAUVEGARDE" -type f -name "${NOM_BASE}-*.sql.gz" -mtime +"$RETENTION_JOURS" -delete

echo "Sauvegarde créée : $DOSSIER_SAUVEGARDE/$NOM_FICHIER"
