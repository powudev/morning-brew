#!/usr/bin/env bash
set -euo pipefail

status_env="$(supabase status -o env)"
api_url="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<<"$status_env")"
anon_key="$(sed -n 's/^ANON_KEY="\(.*\)"$/\1/p' <<<"$status_env")"

case "$api_url" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) echo "E2E builds must use a local Supabase (API_URL=$api_url)" >&2; exit 1 ;;
esac

NEXT_PUBLIC_SUPABASE_URL="$api_url" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="$anon_key" \
NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA" \
  pnpm run build
