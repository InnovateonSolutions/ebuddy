"""Tests estructurales para el flujo de login con Google."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_auth_config_uses_jwt_session_strategy_for_middleware_compatibility():
    config = read("lib/auth/config.ts")

    assert "strategy: 'jwt'" in config or 'strategy: "jwt"' in config, (
        "lib/auth/config.ts debe usar session.strategy='jwt' para que middleware reciba user.id estable"
    )


def test_auth_config_propagates_user_id_through_jwt_and_session_callbacks():
    config = read("lib/auth/config.ts")

    assert "jwt({" in config, "auth config debe definir callback jwt para persistir el user.id"
    assert "token.id = user.id" in config, "jwt callback debe copiar user.id al token"
    assert "session({ session, token })" in config, (
        "session callback debe leer el id desde token, no depender de user en strategy=database"
    )
    assert "token.id ?? token.sub" in config, (
        "session callback debe reconstruir session.user.id desde token.id o token.sub"
    )


def test_google_login_handles_non_redirect_failures_without_leaving_button_blocked():
    page = read("app/(auth)/login/page.tsx")

    assert "redirect: false" in page, (
        "Login con Google debe usar redirect:false para poder manejar errores y desbloquear el botón"
    )
    assert "window.location.href = result.url" in page, (
        "Si signIn devuelve URL válida, la página debe navegar explícitamente"
    )
    assert "setLoading(false)" in page, (
        "El botón de Google debe reactivarse cuando signIn no logra navegar"
    )
    assert "setError(" in page, (
        "La UI de login debe mostrar error si Google no completa el flujo"
    )


def test_dashboard_routes_require_user_id_not_just_user_object():
    layout = read("app/(dashboard)/layout.tsx")
    today_page = read("app/(dashboard)/today/page.tsx")
    settings_page = read("app/(dashboard)/settings/page.tsx")

    assert "if (!session?.user?.id) redirect('/login')" in layout, (
        "El layout autenticado debe redirigir si falta session.user.id para evitar shells vacíos"
    )
    assert "return null" not in today_page, (
        "Today page no debe devolver null si falta user.id; debe redirigir para evitar página en blanco"
    )
    assert "redirect('/login')" in today_page
    assert "return null" not in settings_page, (
        "Settings page no debe devolver null si falta user.id; debe redirigir para evitar página en blanco"
    )
    assert "redirect('/login')" in settings_page
