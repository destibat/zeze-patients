#!/bin/bash
git add database/seeds/20260418001-admin-user.js
git add database/seeds/20260419002-produits.js
git add scripts/deploy-dev.sh
git add backend/src/config/database.js
git commit -m "fix: seeds idempotents (ignoreDuplicates) + retirer seederStorage du runtime"
git push origin dev
