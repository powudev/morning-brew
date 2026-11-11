#!/usr/bin/env bash
set -euo pipefail

email="${1:?用法: $0 <email>}"
read -rsp "密碼(至少 8 碼): " password
echo

status_env="$(supabase status -o env)"
api_url="$(sed -n 's/^API_URL="\(.*\)"$/\1/p' <<<"$status_env")"
service_key="$(sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p' <<<"$status_env")"

case "$api_url" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) echo "只允許對本機 Supabase 執行(API_URL=$api_url)" >&2; exit 1 ;;
esac

user_id="$(
  jq -n --arg email "$email" --arg password "$password" \
    '{email: $email, password: $password, email_confirm: true}' |
  curl -sS --fail-with-body "$api_url/auth/v1/admin/users" \
    -H "apikey: $service_key" -H "Authorization: Bearer $service_key" \
    -H "Content-Type: application/json" --data @- |
  jq -r '.id'
)"

project_id="$(sed -n 's/^project_id = "\(.*\)"$/\1/p' supabase/config.toml)"
docker exec -i "supabase_db_${project_id}" \
  psql -U postgres -v ON_ERROR_STOP=1 -v uid="$user_id" -q <<'SQL'
insert into public.staff (user_id, role) values (:'uid', 'admin') on conflict do nothing;
SQL

echo "已建立店家帳號 $email($user_id)"
