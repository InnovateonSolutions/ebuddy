#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT/scripts/jira/common.sh"

ISSUE_KEY="${1:-}"
TRANSITION_NAME="${2:-Done}"

[ -n "$ISSUE_KEY" ] || err "Uso: ./scripts/jira/close-issue.sh KAN-123 [Done]"

TRANSITIONS_JSON="$(jira_api GET "/rest/api/3/issue/$ISSUE_KEY/transitions")"
TRANSITION_ID="$(python3 - "$TRANSITIONS_JSON" "$TRANSITION_NAME" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
transition_name = sys.argv[2].lower()
# aliases para tableros en español
aliases = {"done": ["listo", "finalizada", "done", "cerrado"]}
candidates = aliases.get(transition_name, [transition_name])

for item in payload.get("transitions", []):
    if item.get("name", "").lower() in candidates:
        print(item["id"])
        break
PY
)"

[ -n "$TRANSITION_ID" ] || err "No se encontró la transición '$TRANSITION_NAME' para $ISSUE_KEY"

PAYLOAD="{\"transition\":{\"id\":\"$TRANSITION_ID\"}}"
jira_api POST "/rest/api/3/issue/$ISSUE_KEY/transitions" "$PAYLOAD"
