#!/bin/bash
# Backup completo do banco (mongodump) antes de deploy/migração, em ~/backups/<nome>_<data-hora>/.
# A senha do banco (MONGO_URI no .env) tem caracteres especiais: digitada num comando ssh no
# terminal ela quebra - aqui ela fica sempre entre aspas.
#
# Uso (no servidor):  bash scripts/backup-banco.sh pre-deploy
set -e
cd "$HOME/PDIAP"
U=$(grep -h '^MONGO_URI=' .env | head -1 | cut -d= -f2-)
D="$HOME/backups/${1:-backup}_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$D"
mongodump --uri="$U" --out="$D" --quiet
N=$(ls "$D"/*/*.bson 2>/dev/null | wc -l)
if [ "$N" -lt 10 ]; then echo "ATENCAO: backup com só $N coleções em $D - NÃO siga adiante"; exit 1; fi
echo "Backup OK: $N coleções em $D ($(du -sh "$D" | cut -f1))"
