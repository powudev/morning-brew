#!/usr/bin/env bash
# E2E 用的 build:帶入「本機」Supabase 的公開 URL / anon key 與 Cloudflare Turnstile 測試 site key。
# 產物只給 wrangler pages dev 測試用,不可部署。
set -euo pipefail

status_env="$(supabase status -o env)"
api_url="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<<"$status_env")"
anon_key="$(sed -n 's/^ANON_KEY="\(.*\)"$/\1/p' <<<"$status_env")"

case "$api_url" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) echo "只允許用本機 Supabase 建置 E2E(API_URL=$api_url)" >&2; exit 1 ;;
esac

NEXT_PUBLIC_SUPABASE_URL="$api_url" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="$anon_key" \
NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA" \
  pnpm exec next build
