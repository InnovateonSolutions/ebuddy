#!/usr/bin/env python3
"""
Envía una notificación de fallo de pipeline a WhatsApp vía Meta API.

Uso:
  WHATSAPP_API_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=... WHATSAPP_OWNER_USER_ID=... \
    python3 scripts/notify-whatsapp.py --stage build --url https://github.com/.../runs/123

Variables de entorno requeridas:
  WHATSAPP_API_TOKEN       — Bearer token de la Meta Graph API
  WHATSAPP_PHONE_NUMBER_ID — ID del número emisor
  WHATSAPP_OWNER_USER_ID   — Número receptor (formato internacional, sin +)

Argumentos:
  --stage  build|deploy   — etapa que falló
  --url    <run-url>      — URL del run de GitHub Actions
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request


def send_notification(token: str, phone_id: str, recipient: str, message: str) -> None:
    payload = json.dumps({
        "messaging_product": "whatsapp",
        "to": recipient,
        "type": "text",
        "text": {"body": message},
    }).encode()

    req = urllib.request.Request(
        f"https://graph.facebook.com/v19.0/{phone_id}/messages",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp.read()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        print(f"ERROR: Meta API returned {exc.code}: {body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as exc:
        print(f"ERROR: request failed: {exc.reason}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Notifica fallo de pipeline vía WhatsApp")
    parser.add_argument("--stage", required=True, choices=["build", "deploy"], help="Etapa que falló")
    parser.add_argument("--url", required=True, help="URL del run de GitHub Actions")
    args = parser.parse_args()

    token = os.environ.get("WHATSAPP_API_TOKEN")
    phone_id = os.environ.get("WHATSAPP_PHONE_NUMBER_ID")
    recipient = os.environ.get("WHATSAPP_OWNER_USER_ID")

    missing = [k for k, v in {"WHATSAPP_API_TOKEN": token, "WHATSAPP_PHONE_NUMBER_ID": phone_id, "WHATSAPP_OWNER_USER_ID": recipient}.items() if not v]
    if missing:
        print(f"ERROR: variables de entorno faltantes: {', '.join(missing)}", file=sys.stderr)
        sys.exit(1)

    stage_label = "Build" if args.stage == "build" else "Deploy"
    message = f"🚨 ebuddy {stage_label} FALLÓ\n{args.url}"

    send_notification(token, phone_id, recipient, message)  # type: ignore[arg-type]
    print(f"✓ Notificación enviada: {stage_label} falló")


if __name__ == "__main__":
    main()
