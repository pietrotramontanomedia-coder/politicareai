#!/usr/bin/env bash
# Installa la newsletter Politicare su un server Ubuntu 24.04 appena creato.
#
#   sudo ./installa.sh newsletter.politicare.it
#
# Va lanciato dalla cartella che contiene docker-compose.yml e Caddyfile (es. /opt/newsletter).
# Si può rilanciare senza danni: non tocca un .env già esistente né i dati.
set -euo pipefail

DOMINIO="${1:-}"
CARTELLA="$(cd "$(dirname "$0")" && pwd)"

if [[ $EUID -ne 0 ]]; then
  echo "Va lanciato come root: sudo ./installa.sh $DOMINIO" >&2
  exit 1
fi
if [[ -z "$DOMINIO" && ! -f "$CARTELLA/.env" ]]; then
  echo "Uso: sudo ./installa.sh newsletter.politicare.it" >&2
  exit 1
fi
cd "$CARTELLA"

echo "→ Aggiornamenti di sistema e aggiornamenti di sicurezza automatici"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -yq -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold
apt-get install -yq ca-certificates curl openssl ufw unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "→ Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

echo "→ Firewall: aperte solo SSH, HTTP e HTTPS"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

PASSWORD_NUOVA=""
if [[ ! -f .env ]]; then
  echo "→ Creo .env con password casuali"
  PASSWORD_NUOVA="$(openssl rand -base64 18 | tr -d '/+=')"
  umask 077
  cat > .env <<EOF
DOMINIO=$DOMINIO
DB_PASSWORD=$(openssl rand -hex 24)
LISTMONK_ADMIN_USER=admin
LISTMONK_ADMIN_PASSWORD=$PASSWORD_NUOVA
EOF
  umask 022
else
  echo "→ .env già presente: lo lascio com'è"
fi

mkdir -p uploads backup
chmod 700 backup

echo "→ Avvio dei servizi"
docker compose pull -q
docker compose up -d

echo "→ Backup automatico del database ogni notte alle 3:30"
chmod +x "$CARTELLA/backup.sh"
cat > /etc/cron.d/newsletter-backup <<EOF
30 3 * * * root $CARTELLA/backup.sh >> /var/log/newsletter-backup.log 2>&1
EOF

DOMINIO_ATTIVO="$(grep '^DOMINIO=' .env | cut -d= -f2)"
echo
echo "Fatto. Fra un minuto il pannello è su: https://$DOMINIO_ATTIVO/admin"
if [[ -n "$PASSWORD_NUOVA" ]]; then
  echo
  echo "  utente:   admin"
  echo "  password: $PASSWORD_NUOVA"
  echo
  echo "Salvate la password in un gestore di password: non viene mostrata di nuovo."
  echo "Dopo il primo accesso potete toglierla da .env (riga LISTMONK_ADMIN_PASSWORD)."
fi
echo
echo "Se la pagina non si apre: il record DNS di $DOMINIO_ATTIVO punta già all'IP di questo server?"
echo "Controllo: docker compose logs caddy"
