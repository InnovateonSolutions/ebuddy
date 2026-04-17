#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT/scripts/jira/common.sh"

usage() {
  cat <<'EOF'
Uso:
  ./scripts/jira/create-issue.sh \
    --title "Implementar X para Y" \
    --problem "Qué problema se resuelve" \
    --acceptance "Qué debe quedar funcionando" \
    --notes "Notas técnicas" \
    --type Task \
    --priority "Must Have" \
    --labels backend,infra
EOF
}

TITLE=""
PROBLEM=""
ACCEPTANCE=""
NOTES=""
ISSUE_TYPE="Task"
MOSCOW_PRIORITY=""
LABELS=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --title) TITLE="${2:-}"; shift 2 ;;
    --problem) PROBLEM="${2:-}"; shift 2 ;;
    --acceptance) ACCEPTANCE="${2:-}"; shift 2 ;;
    --notes) NOTES="${2:-}"; shift 2 ;;
    --type) ISSUE_TYPE="${2:-}"; shift 2 ;;
    --priority) MOSCOW_PRIORITY="${2:-}"; shift 2 ;;
    --labels) LABELS="${2:-}"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) err "Argumento no reconocido: $1" ;;
  esac
done

[ -n "$TITLE" ] || err "--title es obligatorio"
[ -n "$PROBLEM" ] || err "--problem es obligatorio"
[ -n "$ACCEPTANCE" ] || err "--acceptance es obligatorio"
[ -n "$NOTES" ] || err "--notes es obligatorio"
[ -n "$MOSCOW_PRIORITY" ] || err "--priority es obligatorio"
[ -n "$LABELS" ] || err "--labels es obligatorio"

MOSCOW_LABEL="$(moscow_label "$MOSCOW_PRIORITY")"
JIRA_PRIORITY="$(map_jira_priority "$MOSCOW_PRIORITY")"
DESCRIPTION="$(build_adf_doc "$PROBLEM" "$ACCEPTANCE" "$NOTES" "$MOSCOW_PRIORITY")"

MAPPED_ISSUE_TYPE="$(map_issue_type "$ISSUE_TYPE")"

PAYLOAD="$(python3 - "$JIRA_PROJECT_KEY" "$TITLE" "$MAPPED_ISSUE_TYPE" "$JIRA_PRIORITY" "$LABELS" "$MOSCOW_LABEL" "$DESCRIPTION" <<'PY'
import json
import sys

project_key, title, issue_type, jira_priority, labels, moscow_label, description = sys.argv[1:8]
payload = {
    "fields": {
        "project": {"key": project_key},
        "summary": title,
        "issuetype": {"name": issue_type},
        "priority": {"name": jira_priority},
        "labels": [label.strip() for label in labels.split(",") if label.strip()] + [moscow_label],
        "description": json.loads(description),
    }
}
print(json.dumps(payload))
PY
)"

jira_api POST "/rest/api/3/issue" "$PAYLOAD"
