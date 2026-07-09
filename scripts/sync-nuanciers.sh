#!/bin/bash
# Synchronise les nuanciers depuis le dossier de travail SiteNVD vers l'app.
# Usage : ./scripts/sync-nuanciers.sh
#
# - Copie chaque nuancier modifié dans SiteNVD vers Nuanciers/
# - Normalise les fins de ligne (CRLF -> LF)
# - Corrige le tiret cadratin (–) en double tiret (--), coquille récurrente
#   quand les codes articles sont retapés à la main
# - Vérifie que chaque code article référencé existe dans la base articles
# - Signale les codes en double au sein d'une même ligne (bouton dupliqué)

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="/Users/thierry/Documents/Claude/Projects/NV Diffusion 20P/SiteNVD/docs/catalogue/nuanciers"
DEST_DIR="$APP_DIR/Nuanciers"
ARTICLE_BASE="$APP_DIR/BaseAppCmd/BaseArticleTarifs.csv"

if [ ! -d "$SRC_DIR" ]; then
    echo "Dossier source introuvable : $SRC_DIR" >&2
    exit 1
fi

changed=0
warnings=0

for src_file in "$SRC_DIR"/*.csv; do
    filename="$(basename "$src_file")"
    dest_file="$DEST_DIR/$filename"

    if [ ! -f "$dest_file" ]; then
        echo "Ignoré (pas de nuancier correspondant dans l'app) : $filename"
        continue
    fi

    # Normalise CRLF -> LF et corrige le tiret cadratin -> double tiret
    tmp_file="$(mktemp)"
    tr -d '\r' < "$src_file" | sed 's/–/--/g' > "$tmp_file"

    if diff -q "$tmp_file" "$dest_file" > /dev/null 2>&1; then
        rm "$tmp_file"
        continue
    fi

    mv "$tmp_file" "$dest_file"
    changed=$((changed + 1))
    echo "Mis à jour : $filename"

    # Validation des codes articles référencés
    tail -n +2 "$dest_file" | tr ';' '\n' | grep ':' | cut -d: -f2 | sort -u | while read -r code; do
        [ -z "$code" ] && continue
        if ! grep -q "^$code;" "$ARTICLE_BASE"; then
            echo "  ABSENT de la base articles : $code"
        fi
    done

    # Détection des codes dupliqués sur une même ligne
    awk -F';' 'NR>1 {
        delete seen
        for (i=2; i<=NF; i++) {
            split($i, parts, ":")
            code = parts[2]
            if (code != "" ) {
                if (code in seen) print "  DOUBLON sur la ligne \"" $1 "\" : " code
                seen[code] = 1
            }
        }
    }' "$dest_file"
done

echo
if [ "$changed" -eq 0 ]; then
    echo "Rien à synchroniser, tout est déjà à jour."
else
    echo "$changed fichier(s) synchronisé(s). Vérifiez les éventuels messages ABSENT/DOUBLON ci-dessus avant de committer."
fi
