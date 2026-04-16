"""
Tests estructurales para el manejo seguro de API keys.

Protege tres invariantes:
1. La API key persistida no se guarda en texto plano.
2. El backend solo conserva un hash + preview enmascarado.
3. La UI no depende de recuperar el secreto completo desde la DB.
"""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_user_preferences_store_hash_and_preview_instead_of_plaintext_api_key():
    schema = read("lib/db/schema.ts")
    assert "apiKeyHash: text('api_key_hash')" in schema
    assert "apiKeyPreview: text('api_key_preview')" in schema
    assert "apiKey: text('api_key')" not in schema


def test_api_key_route_hashes_keys_before_persisting_them():
    route = read("app/api/user/api-key/route.ts")
    assert "createHash('sha256')" in route or 'createHash("sha256")' in route
    assert "apiKeyHash" in route
    assert "apiKeyPreview" in route
    assert "set: { apiKey: newKey }" not in route
    assert ".values({ userId, apiKey: newKey })" not in route


def test_api_key_get_does_not_return_secret_from_database():
    route = read("app/api/user/api-key/route.ts")
    assert "return apiSuccess({ key: prefs?.apiKey ?? null })" not in route
    assert "preview" in route
    assert "hasKey" in route


def test_settings_page_reads_preview_instead_of_secret():
    page = read("app/(dashboard)/settings/page.tsx")
    assert "apiKeyPreview" in page
    assert "apiKeyHash" in page
    assert "select({ apiKey:" not in page
    assert "initialKey=" not in page


def test_api_key_component_starts_from_masked_preview_not_persisted_secret():
    component = read("components/api-key-section.tsx")
    assert "initialPreview" in component
    assert "initialKey" not in component
