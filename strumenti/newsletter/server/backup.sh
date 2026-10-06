#!/usr/bin/env bash
# Copia del database della newsletter (contatti, campagne, statistiche).
# Parte ogni notte da cron (lo imposta installa.sh); si può lanciare anche a mano.
# Tiene gli ultimi 14 giorni in ./backup. Per una copia fuori dal server attivate
# anche i Backup di Hetzner (README → Server).
set -euo pipefail

CARTELLA="$(cd "$(dirname "$0")" && pwd)"
cd "$CARTELLA"
mkdir -p backup
chmod 700 backup

FILE="backup/listmonk-$(date +%F).sql.gz"
docker compose exec -T db pg_dump -U listmonk listmonk | gzip > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
chmod 600 "$FILE"

find backup -name 'listmonk-*.sql.gz' -mtime +14 -delete
echo "$(date '+%F %T') backup salvato in $FILE"
