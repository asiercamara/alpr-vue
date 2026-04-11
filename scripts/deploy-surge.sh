#!/usr/bin/env bash
set -euo pipefail

# Simple deploy script for Surge. Usage:
# 1) Make executable: chmod +x scripts/deploy-surge.sh
# 2) Run: ./scripts/deploy-surge.sh [your-domain]
# If no domain is provided, defaults to alpr-vue.surge.sh

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

DOMAIN="${1:-alpr-vue.surge.sh}"
shift || true

echo "Building project..."
pnpm build

if [ ! -d "$DIR/dist" ]; then
  echo "Error: dist directory not found. Did the build fail?"
  exit 1
fi

echo "Publishing ./dist to Surge domain: $DOMAIN"

SURGE_ARGS=("./dist" "$DOMAIN" "$@")

if command -v surge >/dev/null 2>&1; then
  surge "${SURGE_ARGS[@]}"
elif command -v npx >/dev/null 2>&1; then
  npx surge "${SURGE_ARGS[@]}"
elif command -v pnpm >/dev/null 2>&1; then
  pnpm dlx surge "${SURGE_ARGS[@]}"
else
  echo "Please install surge (npm i -g surge) or use npx/pnpm."
  exit 1
fi

echo "Deploy finished."
