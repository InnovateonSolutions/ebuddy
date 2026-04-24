#!/usr/bin/env python3
"""
Obtiene la IP pública de un Droplet de DigitalOcean por nombre.
Reemplaza el script inline en deploy.yml.

Uso:
  DROPLET_NAME=ebuddy-prod-droplet DO_TOKEN=dop_v1_... \
    python3 scripts/get-droplet-ip.py

Salida:
  Imprime la IP pública a stdout (capturar con $(...) en bash).
  Errores van a stderr.

Exit code 0 = éxito, 1 = fallo.
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


def get_droplet_info(droplet_name: str, do_token: str) -> tuple[str, int]:
    encoded_name = urllib.parse.quote(droplet_name)
    url = f"https://api.digitalocean.com/v2/droplets?name={encoded_name}"

    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {do_token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        print(f"ERROR: DO API returned {exc.code}: {body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as exc:
        print(f"ERROR: request failed: {exc.reason}", file=sys.stderr)
        sys.exit(1)

    droplets = data.get("droplets", [])
    if not droplets:
        print(f"ERROR: droplet '{droplet_name}' not found", file=sys.stderr)
        sys.exit(1)

    networks = droplets[0].get("networks", {}).get("v4", [])
    public = [n for n in networks if n.get("type") == "public"]
    if not public:
        print(f"ERROR: droplet '{droplet_name}' has no public IPv4 address", file=sys.stderr)
        sys.exit(1)

    droplet_id = droplets[0]["id"]
    return public[0]["ip_address"], droplet_id


def get_droplet_ip(droplet_name: str, do_token: str) -> str:
    ip, _ = get_droplet_info(droplet_name, do_token)
    return ip


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="Obtiene IP (y opcionalmente ID) de un Droplet DO")
    parser.add_argument("--with-id", action="store_true", help="Emite ip\\nid en dos líneas (para deploy.yml)")
    args, _ = parser.parse_known_args()

    droplet_name = os.environ.get("DROPLET_NAME")
    do_token = os.environ.get("DO_TOKEN")

    if not droplet_name:
        print("ERROR: DROPLET_NAME env var is required", file=sys.stderr)
        sys.exit(1)
    if not do_token:
        print("ERROR: DO_TOKEN env var is required", file=sys.stderr)
        sys.exit(1)

    ip, droplet_id = get_droplet_info(droplet_name, do_token)

    if args.with_id:
        print(ip)
        print(droplet_id)
    else:
        print(ip)


if __name__ == "__main__":
    main()
