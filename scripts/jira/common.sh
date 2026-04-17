#!/usr/bin/env bash
set -euo pipefail

err() {
  echo "ERROR: $*" >&2
  exit 1
}

require_jira_env() {
  local missing=()
  local var_name

  for var_name in JIRA_BASE_URL JIRA_PROJECT_KEY JIRA_EMAIL JIRA_TOKEN; do
    if [ -z "${!var_name:-}" ]; then
      missing+=("$var_name")
    fi
  done

  if [ "${#missing[@]}" -gt 0 ]; then
    err "Faltan variables de entorno de Jira: ${missing[*]}"
  fi
}

jira_api() {
  local method="$1"
  local path="$2"
  local data="${3:-}"

  require_jira_env

  if [ -n "$data" ]; then
    curl -fsS \
      -u "$JIRA_EMAIL:$JIRA_TOKEN" \
      -X "$method" \
      -H "Accept: application/json" \
      -H "Content-Type: application/json" \
      "$JIRA_BASE_URL$path" \
      --data "$data"
    return
  fi

  curl -fsS \
    -u "$JIRA_EMAIL:$JIRA_TOKEN" \
    -X "$method" \
    -H "Accept: application/json" \
    "$JIRA_BASE_URL$path"
}

json_escape() {
  python3 -c 'import json, sys; print(json.dumps(sys.argv[1]))' "$1"
}

build_adf_doc() {
  python3 - "$1" "$2" "$3" "$4" <<'PY'
import json
import sys

problem, acceptance, notes, moscow = sys.argv[1:5]

def paragraph(text):
    return {
        "type": "paragraph",
        "content": [{"type": "text", "text": text}],
    }

doc = {
    "version": 1,
    "type": "doc",
    "content": [
        paragraph(f"Prioridad MoSCoW: {moscow}"),
        paragraph("Problema"),
        paragraph(problem),
        paragraph("Criterios de aceptación"),
        paragraph(acceptance),
        paragraph("Notas técnicas"),
        paragraph(notes),
    ],
}

print(json.dumps(doc))
PY
}

map_issue_type() {
  case "$1" in
    "Task") echo "Tarea" ;;
    "Story") echo "Historia" ;;
    "Bug") echo "Tarea" ;;
    *) err "Tipo inválido: $1. Válidos: Task, Story, Bug" ;;
  esac
}

moscow_label() {
  case "$1" in
    "Must Have") echo "moscow-must-have" ;;
    "Should Have") echo "moscow-should-have" ;;
    "Could Have") echo "moscow-could-have" ;;
    "Won't Have") echo "moscow-wont-have" ;;
    *) err "Prioridad MoSCoW inválida: $1" ;;
  esac
}

map_jira_priority() {
  case "$1" in
    "Must Have") echo "High" ;;
    "Should Have") echo "Medium" ;;
    "Could Have") echo "Low" ;;
    "Won't Have") echo "Lowest" ;;
    *) err "Prioridad MoSCoW inválida: $1" ;;
  esac
}
