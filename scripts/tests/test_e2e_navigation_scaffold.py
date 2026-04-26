"""Tests estructurales para la base de navegabilidad E2E."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_playwright_base_files_exist():
    assert (REPO_ROOT / "playwright.config.ts").exists(), (
        "playwright.config.ts debe existir para correr pruebas reales de navegador"
    )
    assert (REPO_ROOT / "e2e" / "navigation.spec.ts").exists(), (
        "e2e/navigation.spec.ts debe cubrir la navegabilidad crítica"
    )


def test_package_json_exposes_e2e_navigation_scripts():
    package_json = read("package.json")

    assert '"test:e2e"' in package_json, (
        "package.json debe exponer un script test:e2e para Playwright"
    )
    assert "@playwright/test" in package_json, (
        "Playwright debe estar declarado como devDependency"
    )


def test_ci_runs_browser_navigation_checks_for_app_changes():
    workflow = read(".github/workflows/old/ci.yml")

    assert "Browser E2E" in workflow, (
        "ci.yml debe incluir un job de navegador para navegabilidad crítica"
    )
    assert "npx playwright install --with-deps chromium" in workflow, (
        "ci.yml debe instalar Chromium para ejecutar Playwright"
    )
    assert "npm run test:e2e" in workflow, (
        "ci.yml debe ejecutar la suite E2E de navegador"
    )


def test_navigation_spec_covers_login_redirect_and_back_button():
    spec = read("e2e/navigation.spec.ts")

    assert "page.route" in spec, (
        "La spec debe usar intercepts para no depender de Google real"
    )
    assert "page.goBack()" in spec, (
        "La spec debe cubrir el botón Atrás del navegador"
    )
    assert "/kanban" in spec and "/login" in spec, (
        "La navegabilidad crítica debe incluir redirect de rutas protegidas a login"
    )
