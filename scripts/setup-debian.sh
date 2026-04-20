#!/bin/bash
# Script d'installation pour serveur Debian (Proxmox, VMware, etc.)
# Usage : bash setup-debian.sh
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR]${NC}  $1"; exit 1; }

# Vérifier root
[ "$EUID" -ne 0 ] && error "Lancer en root : sudo bash setup-debian.sh"

info "=== Installation ZEZEPAGNON sur Debian ==="

# 1. Mise à jour système
info "Mise à jour du système..."
apt-get update -qq && apt-get upgrade -y -qq

# 2. Dépendances de base
info "Installation des dépendances..."
apt-get install -y -qq \
    curl wget git ca-certificates gnupg \
    ufw fail2ban unattended-upgrades

# 3. Docker
if ! command -v docker &>/dev/null; then
    info "Installation de Docker..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
    info "Docker installé : $(docker --version)"
else
    info "Docker déjà installé : $(docker --version)"
fi

# 4. Ajouter l'utilisateur courant au groupe docker (si pas root)
REEL_USER="${SUDO_USER:-$USER}"
if [ "$REEL_USER" != "root" ]; then
    usermod -aG docker "$REEL_USER"
    info "Utilisateur $REEL_USER ajouté au groupe docker"
fi

# 5. Firewall UFW
info "Configuration du firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS (pour plus tard avec le domaine)
ufw --force enable
info "Firewall activé"

# 6. Fail2ban (protection brute-force SSH)
systemctl enable --now fail2ban
info "Fail2ban activé"

# 7. Mises à jour automatiques de sécurité
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
info "Mises à jour automatiques configurées"

# 8. Clé SSH pour GitHub (si absente)
SSH_KEY="/root/.ssh/id_ed25519"
if [ ! -f "$SSH_KEY" ]; then
    info "Génération de la clé SSH pour GitHub..."
    ssh-keygen -t ed25519 -C "zezepagnon-prod" -f "$SSH_KEY" -N ""
    echo ""
    warning "=== CLÉ PUBLIQUE À AJOUTER SUR GITHUB ==="
    warning "GitHub → Settings → Deploy keys → Add deploy key"
    echo ""
    cat "${SSH_KEY}.pub"
    echo ""
fi

info "=== Installation terminée ! ==="
echo ""
echo "Prochaines étapes :"
echo "  1. Ajouter la clé SSH ci-dessus sur GitHub (Deploy keys, read-only)"
echo "  2. git clone git@github.com:VOTRE_PSEUDO/zeze-patients.git /opt/zezepagnon"
echo "  3. cd /opt/zezepagnon && cp .env.example .env && nano .env"
echo "  4. bash scripts/first-deploy.sh"
echo ""
