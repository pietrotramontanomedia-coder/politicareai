#!/usr/bin/env bash
# Porta il portale all'ultima versione di main e lo ricostruisce. Si lancia sul server.
set -euo pipefail
cd "$(dirname "$0")"
if [ -d codice/.git ]; then
  git -C codice fetch -q origin main && git -C codice reset -q --hard origin/main
else
  git clone -q --depth 1 https://github.com/pietrotramontanomedia-coder/politicareai.git codice
fi
docker compose up -d --build
docker image prune -f >/dev/null
echo "$(date '+%F %T') portale aggiornato a $(git -C codice rev-parse --short HEAD)"
