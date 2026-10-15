#!/usr/bin/env bash
# Copia notturna dell'archivio (portale redazione, radar, ponte Telegram → X, token Instagram).
# Parte da cron alle 3:30; si può lanciare anche a mano. Tiene gli ultimi 30 giorni in ./backup.
set -euo pipefail

CARTELLA="$(cd "$(dirname "$0")" && pwd)"
cd "$CARTELLA"
mkdir -p backup
chmod 700 backup

FILE="backup/archivio-$(date +%F).sql.gz"
docker compose exec -T db pg_dump -U archivio archivio | gzip > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
chmod 600 "$FILE"

find backup -name 'archivio-*.sql.gz' -mtime +30 -delete
echo "$(date '+%F %T') backup salvato in $FILE"
