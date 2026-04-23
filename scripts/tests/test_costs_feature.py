from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (REPO_ROOT / path).read_text()


def test_costs_page_is_owner_only():
    page = read("app/(dashboard)/costs/page.tsx")
    assert "isOwner" in page, "La página /costs debe verificar isOwner"
    assert "redirect('/today')" in page, "Usuarios no-owner deben ser redirigidos a /today"
    assert "force-dynamic" in page


def test_costs_api_route_is_owner_only():
    route = read("app/api/costs/route.ts")
    assert "isOwner" in route
    assert "403" in route, "API debe devolver 403 si no es owner"
    assert "401" in route, "API debe devolver 401 si no hay sesión"


def test_costs_service_uses_do_token():
    service = read("features/costs/server/do-billing.ts")
    assert "DO_TOKEN" in service, "El servicio debe leer DO_TOKEN del env"
    assert "/v2/customers/my/balance" in service
    assert "/v2/customers/my/invoices" in service


def test_costs_service_handles_missing_token():
    service = read("features/costs/server/do-billing.ts")
    assert "available: false" in service, "Sin DO_TOKEN debe retornar available:false"


def test_do_token_written_to_env_on_deploy():
    deploy = read(".github/workflows/deploy.yml")
    assert "DO_TOKEN: ${{ secrets.DO_TOKEN }}" in deploy, (
        "DO_TOKEN debe estar en el bloque env: del step Write .env"
    )
    assert "DO_TOKEN" in deploy.split("envs:")[1].split("\n")[0], (
        "DO_TOKEN debe estar en la lista envs: para que se pase al host remoto"
    )


def test_costs_nav_item_only_for_owner():
    layout = read("app/(dashboard)/layout.tsx")
    costs_pos = layout.index('href="/costs"')
    owner_check = layout.rindex("owner &&", 0, costs_pos)
    assert owner_check > 0, "El nav item /costs debe estar condicionado a owner"


def test_costs_bottom_nav_only_for_owner():
    nav = read("features/navigation/components/bottom-nav.tsx")
    assert "/costs" in nav
    assert "owner" in nav
