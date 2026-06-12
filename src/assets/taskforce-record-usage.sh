#!/usr/bin/env bash
# Taskforce metrics hook for Claude Code (Stop event).
# Records each turn's token usage to your Taskforce Metrics page.
# Fails silently and never blocks your session.
set -uo pipefail
trap 'exit 0' EXIT

# Token from the Connect Agent flow (legacy path kept as a fallback).
token_file="$HOME/.taskforce_mcp_token"
[ -r "$token_file" ] || token_file="$HOME/.enderai_mcp_token"
[ -r "$token_file" ] || exit 0
token="$(tr -d '\r\n' < "$token_file")"
[ -n "$token" ] || exit 0

backend="${TASKFORCE_BACKEND_URL:-https://enderai-backend.onrender.com}"

# The Stop payload (stdin) points at the session transcript; take the last
# assistant turn carrying usage — scanning from the end keeps it cheap.
transcript="$(jq -r '.transcript_path // empty')"
[ -r "$transcript" ] || exit 0
turn="$(tac "$transcript" | awk '/"type":"assistant"/ && /"usage":/ {print; exit}')"
[ -n "$turn" ] || exit 0

usage="$(jq -c '{
  model_id: (.message.model // "unknown"),
  input_tokens: (.message.usage.input_tokens // 0),
  output_tokens: (.message.usage.output_tokens // 0),
  cache_read_input_tokens: (.message.usage.cache_read_input_tokens // 0),
  cache_creation_input_tokens: (.message.usage.cache_creation_input_tokens // 0)
}' <<<"$turn")"
[ -n "$usage" ] || exit 0

# Skip empty finalization turns where nothing was generated.
[ "$(jq -r '[.[] | numbers] | add' <<<"$usage")" = 0 ] && exit 0

curl -sS --max-time 8 -X POST \
  -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
  --data "$usage" "$backend/api/v1/v2/metrics/usage?source=hook" >/dev/null 2>&1 || true
