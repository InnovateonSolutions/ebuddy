"""
Tests unitarios para la lógica de API key (KAN-29).

Verifica:
- Formato correcto: 64 caracteres hexadecimales (32 bytes)
- Unicidad: dos generaciones siempre producen keys distintas
- Validación de formato: regex /^[0-9a-f]{64}$/
- Enmascaramiento seguro: solo se muestran los primeros y últimos 8 chars
- Rechazo de keys con formato inválido
"""

import re
import secrets

# ── Constantes que replican la lógica del endpoint TypeScript ──────────────────

API_KEY_LENGTH = 64          # 32 bytes × 2 hex chars/byte
API_KEY_PATTERN = re.compile(r'^[0-9a-f]{64}$')


def generate_api_key() -> str:
    """Replica la generación del endpoint POST /api/user/api-key."""
    return secrets.token_hex(32)   # equivalente a randomBytes(32).toString('hex')


def mask_api_key(key: str) -> str:
    """
    Replica el enmascaramiento del componente ApiKeySection:
    muestra los primeros 8 + '•' × 24 + últimos 8 caracteres.
    """
    if len(key) < 16:
        raise ValueError("Key demasiado corta para enmascarar")
    return key[:8] + "•" * 24 + key[-8:]


def is_valid_api_key(key: str) -> bool:
    """Valida que la key cumple el formato esperado."""
    return bool(API_KEY_PATTERN.match(key))


# ── Tests de generación ────────────────────────────────────────────────────────

class TestApiKeyGeneration:

    def test_generated_key_has_64_chars(self):
        """La key generada mide exactamente 64 caracteres."""
        key = generate_api_key()
        assert len(key) == API_KEY_LENGTH, f"Expected 64, got {len(key)}"

    def test_generated_key_is_lowercase_hex(self):
        """La key contiene solo dígitos hexadecimales en minúscula."""
        key = generate_api_key()
        assert API_KEY_PATTERN.match(key), f"Key '{key}' no cumple el patrón hex"

    def test_two_generated_keys_are_different(self):
        """Dos generaciones consecutivas producen keys distintas (unicidad)."""
        key1 = generate_api_key()
        key2 = generate_api_key()
        assert key1 != key2, "Las keys generadas no deben ser iguales (falla de aleatoriedad)"

    def test_generated_key_entropy(self):
        """100 keys generadas son todas únicas (sin colisiones en muestra pequeña)."""
        keys = {generate_api_key() for _ in range(100)}
        assert len(keys) == 100, "Se encontraron colisiones en 100 keys generadas"

    def test_generated_key_represents_32_bytes(self):
        """64 chars hex = 32 bytes de entropía real."""
        key = generate_api_key()
        raw_bytes = bytes.fromhex(key)
        assert len(raw_bytes) == 32


# ── Tests de validación de formato ────────────────────────────────────────────

class TestApiKeyValidation:

    def test_valid_key_passes(self):
        """Una key bien formada pasa la validación."""
        key = "a" * 64
        assert is_valid_api_key(key)

    def test_valid_generated_key_passes(self):
        """Una key recién generada pasa la validación."""
        key = generate_api_key()
        assert is_valid_api_key(key)

    def test_key_too_short_fails(self):
        """Una key de 63 chars falla la validación."""
        assert not is_valid_api_key("a" * 63)

    def test_key_too_long_fails(self):
        """Una key de 65 chars falla la validación."""
        assert not is_valid_api_key("a" * 65)

    def test_uppercase_hex_fails(self):
        """Las keys con mayúsculas fallan (se espera minúscula)."""
        assert not is_valid_api_key("A" * 64)

    def test_non_hex_chars_fail(self):
        """Caracteres fuera de [0-9a-f] fallan."""
        assert not is_valid_api_key("g" * 64)
        assert not is_valid_api_key("z" * 64)
        assert not is_valid_api_key("-" * 64)

    def test_empty_string_fails(self):
        """String vacío falla la validación."""
        assert not is_valid_api_key("")

    def test_key_with_spaces_fails(self):
        """Una key con espacios falla."""
        assert not is_valid_api_key(" " * 64)

    def test_key_with_dashes_fails(self):
        """Formato UUID con guiones falla (no es el formato esperado)."""
        assert not is_valid_api_key("a1b2c3d4-e5f6-7890-abcd-ef1234567890abcd")


# ── Tests de enmascaramiento ───────────────────────────────────────────────────

class TestApiKeyMasking:

    def test_mask_shows_first_8_chars(self):
        """El enmascaramiento preserva los primeros 8 caracteres."""
        key = "abcdef1234567890" + "0" * 48
        masked = mask_api_key(key)
        assert masked.startswith("abcdef12")

    def test_mask_shows_last_8_chars(self):
        """El enmascaramiento preserva los últimos 8 caracteres."""
        key = "0" * 48 + "1234567890abcdef"
        masked = mask_api_key(key)
        assert masked.endswith("90abcdef")

    def test_mask_middle_is_bullets(self):
        """El centro del masked key usa 24 bullets."""
        key = generate_api_key()
        masked = mask_api_key(key)
        middle = masked[8:-8]
        assert middle == "•" * 24, f"Expected 24 bullets, got '{middle}'"

    def test_mask_total_length(self):
        """La key enmascarada mide 8 + 24 + 8 = 40 caracteres."""
        key = generate_api_key()
        masked = mask_api_key(key)
        assert len(masked) == 40

    def test_mask_does_not_expose_middle(self):
        """El centro de la key original no aparece en el masked output."""
        key = generate_api_key()
        masked = mask_api_key(key)
        # Los caracteres 8..55 de la key no deben estar en el masked (sin los extremos)
        middle_original = key[8:56]
        assert middle_original not in masked
