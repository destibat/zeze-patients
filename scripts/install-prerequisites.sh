#!/bin/bash
# =============================================================================
# Script d'installation des prérequis — ZEZEPAGNON Dossiers Patients
# Cible : Debian 12 (Bookworm)
# Usage : sudo bash scripts/install-prerequisites.sh
# =============================================================================

set -e

COULEUR_VERT='\033[0;32m'
COULEUR_JAUNE='\033[1;33m'
COULEUR_ROUGE='\033[0;31m'
SANS_COULEUR='\033[0m'

log_info()    { echo -e "${COULEUR_VERT}[INFO]${SANS_COULEUR} $1"; }
log_warn()    { echo -e "${COULEUR_JAUNE}[WARN]${SANS_COULEUR} $1"; }
log_erreur()  { echo -e "${COULEUR_ROUGE}[ERREUR]${SANS_COULEUR} $1"; exit 1; }

# Vérification root
if [ "$EUID" -ne 0 ]; then
  log_erreur "Ce script doit être exécuté en tant que root (sudo)."
fi

log_info "=== Installation des prérequis ZEZEPAGNON Dossiers Patients ==="
log_info "Cible : Debian 12 (Bookworm)"

# --- Mise à jour du système ---
log_info "Mise à jour du système..."
apt update && apt upgrade -y

# --- Paquets de base ---
log_info "Installation des paquets système de base..."
apt install -y \
  curl wget git build-essential software-properties-common \
  ca-certificates gnupg lsb-release ufw fail2ban unzip \
  htop iotop net-tools

# --- Node.js v20 LTS ---
log_info "Installation de Node.js v20 LTS..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
else
  log_warn "Node.js déjà installé : $(node --version)"
fi
log_info "Node.js : $(node --version) | npm : $(npm --version)"

# --- MariaDB ---
log_info "Installation de MariaDB..."
if ! command -v mysql &>/dev/null; then
  apt install -y mariadb-server mariadb-client
  systemctl enable --now mariadb
  log_warn "MariaDB installé. Lancez 'sudo mysql_secure_installation' pour sécuriser l'installation."
else
  log_warn "MariaDB déjà installé."
fi

# --- Nginx ---
log_info "Installation de Nginx..."
if ! command -v nginx &>/dev/null; then
  apt install -y nginx
  systemctl enable --now nginx
else
  log_warn "Nginx déjà installé."
fi

# --- PM2 ---
log_info "Installation de PM2..."
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
  pm2 startup systemd
else
  log_warn "PM2 déjà installé."
fi

# --- Certbot (SSL Let's Encrypt) ---
log_info "Installation de Certbot..."
if ! command -v certbot &>/dev/null; then
  apt install -y certbot python3-certbot-nginx
else
  log_warn "Certbot déjà installé."
fi

# --- Tesseract OCR ---
log_info "Installation de Tesseract OCR (analyse NFS)..."
apt install -y tesseract-ocr tesseract-ocr-fra tesseract-ocr-eng
log_info "Tesseract : $(tesseract --version | head -1)"

# --- Chromium (pour Puppeteer / génération PDF) ---
log_info "Installation de Chromium..."
apt install -y chromium

# --- Configuration du pare-feu UFW ---
log_info "Configuration du pare-feu UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
log_info "Statut UFW :"
ufw status

# --- Création de l'utilisateur système zezepagnon (pour la production) ---
if ! id "zezepagnon" &>/dev/null; then
  log_info "Création de l'utilisateur système 'zezepagnon'..."
  useradd --system --no-create-home --shell /usr/sbin/nologin zezepagnon
  log_info "Utilisateur 'zezepagnon' créé."
else
  log_warn "Utilisateur 'zezepagnon' déjà existant."
fi

# --- Création du dossier de logs ---
log_info "Création du dossier de logs applicatifs..."
mkdir -p /var/log/zezepagnon
chown zezepagnon:zezepagnon /var/log/zezepagnon
chmod 750 /var/log/zezepagnon

log_info ""
log_info "=== Installation terminée avec succès ! ==="
log_info ""
log_info "Prochaines étapes :"
log_info "  1. sudo mysql_secure_installation"
log_info "  2. Créer la base de données : mysql -u root -p < database/schema.sql"
log_info "  3. Configurer /etc/nginx/sites-available/zezepagnon"
log_info "  4. sudo certbot --nginx -d patients.zezepagnon.solution"
log_info "  5. Lancer l'application : pm2 start ecosystem.config.js"
