#!/bin/bash
# Affiche l'état de tous les cabinets
#
# Usage : sudo bash scripts/status-cabinets.sh

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  État des cabinets ZEZEPAGNON"
echo "══════════════════════════════════════════════════════════════"
echo ""

docker ps --format "table {{.Names}}\t{{.Status}}" \
  | grep -E "^NAMES|_db|_backend|_frontend|nginx"

echo ""
echo "══════════════════════════════════════════════════════════════"
