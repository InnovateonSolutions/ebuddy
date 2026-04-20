"""Tests estructurales para robustez del calendario."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_calendar_events_route_sanitizes_invalid_days_query_param():
    route = read("app/api/calendar/events/route.ts")

    assert "Number.isFinite" in route, (
        "/api/calendar/events debe validar days antes de usarlo"
    )
    assert "Math.max" in route and "Math.min" in route, (
        "/api/calendar/events debe acotar days a un rango seguro"
    )


def test_calendar_secret_utils_support_legacy_plaintext_tokens():
    secrets = read("lib/secrets.ts")
    calendar = read("features/calendar/server/index.ts")

    assert "decryptSecretOrPlaintext" in secrets, (
        "lib/secrets.ts debe tolerar tokens legacy en texto plano mientras conviven con los cifrados"
    )
    assert "try {" in secrets and "return value" in secrets, (
        "El fallback de secretos debe conservar el valor original cuando no pueda descifrarlo"
    )
    assert "decryptSecretOrPlaintext(token.accessToken)" in calendar
    assert "decryptSecretOrPlaintext(token.refreshToken)" in calendar
