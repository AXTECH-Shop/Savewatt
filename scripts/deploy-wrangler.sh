#!/usr/bin/env zsh
set -euo pipefail

PROJECT_NAME="${1:-savewatt}"
OUTPUT_DIR=".deploy-site"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/public/assets"

cp index.html index-v2.html styles.css styles-v2.css script.js script-v2.js _headers "$OUTPUT_DIR/"
cp robots.txt sitemap.xml llms.txt llm.txt "$OUTPUT_DIR/"
cp -R mentions-legales politique-de-confidentialite cookies plan-du-site "$OUTPUT_DIR/"
cp -R public/assets/generated-v3 "$OUTPUT_DIR/public/assets/"

wrangler pages project create "$PROJECT_NAME" --production-branch main || true
wrangler pages deploy "$OUTPUT_DIR" \
  --project-name "$PROJECT_NAME" \
  --branch main \
  --commit-hash "$(git rev-parse HEAD)" \
  --commit-message "$(git log -1 --pretty=%s)"