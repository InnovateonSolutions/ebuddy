#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT/scripts/jira/common.sh"

ISSUE_KEY="${1:-}"
[ -n "$ISSUE_KEY" ] || err "Uso: ./scripts/jira/transitions.sh KAN-123"

jira_api GET "/rest/api/3/issue/$ISSUE_KEY/transitions"
