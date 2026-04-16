from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


# ── Triggers ──────────────────────────────────────────────────────────────────

def test_deploy_workflow_uses_positive_paths_filter():
    workflow = (REPO_ROOT / ".github" / "workflows" / "deploy.yml").read_text()

    assert "workflow_call:" in workflow
    assert "workflow_dispatch:" in workflow
    assert "paths:" not in workflow
    assert "paths-ignore:" not in workflow


def test_deploy_workflow_is_not_directly_triggered_by_push():
    workflow = (REPO_ROOT / ".github" / "workflows" / "deploy.yml").read_text()

    assert "\n  push:\n" not in workflow
    assert "\n  pull_request:\n" not in workflow


def test_ci_workflow_detects_application_and_infrastructure_changes():
    workflow = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text()

    for expected_path in (
        "permissions:",
        "id-token: write",
        "app/*|components/*|hooks/*|lib/*|types/*|public/*|db/*|drizzle/*",
        "infra/*|.github/workflows/terraform.yml|.github/workflows/bootstrap-deploy.yml",
        "terraform-plan:",
        "needs['detect-changes'].outputs.infra_changed",
        "needs['detect-changes'].outputs.app_changed",
        "needs['terraform-plan'].result",
        "uses: ./.github/workflows/deploy.yml",
        "uses: ./.github/workflows/terraform.yml",
    ):
        assert expected_path in workflow


# ── Estructura del job build en deploy.yml ────────────────────────────────────
#
# Los tests siguientes protegen el orden correcto de los pasos del job build.
# El pipeline tuvo 5 commits de "fix:" seguidos causados por el orden incorrecto:
#
#   ❌ docker/login-action para DOCR          → falla con buildx (auth no propagada)
#   ❌ docker/login-action después de buildx  → sigue fallando
#   ❌ GC antes del push                      → bloquea el registry durante el push
#   ✅ doctl registry login + GC después push → orden correcto definitivo
#
# Estos tests verifican la secuencia definitiva y previenen regresiones.

class TestDeployWorkflowBuildStep:

    def setup_method(self):
        self.workflow = (REPO_ROOT / ".github" / "workflows" / "deploy.yml").read_text()

    # ── Método de autenticación DOCR ─────────────────────────────────────────

    def test_docr_uses_doctl_registry_login(self):
        """El login a DOCR se hace con 'doctl registry login', no con docker/login-action.

        docker/login-action configura el credential store del daemon de Docker pero
        buildx corre en un contenedor aislado que no hereda esa configuración.
        doctl registry login escribe directamente en el credential helper de buildx.
        """
        assert "doctl registry login" in self.workflow

    def test_docr_does_not_use_docker_login_action(self):
        """docker/login-action NO debe usarse para DOCR cuando buildx está activo.

        Este fue el error original que causó 3 commits de fix fallidos.
        """
        assert "docker/login-action" not in self.workflow

    # ── Orden: buildx antes que el login ─────────────────────────────────────

    def test_buildx_setup_before_docr_login(self):
        """setup-buildx-action debe aparecer ANTES de 'doctl registry login'.

        buildx necesita estar configurado para que doctl pueda registrar
        el credential helper en el contexto correcto del builder.
        """
        buildx_pos = self.workflow.index("setup-buildx-action")
        login_pos = self.workflow.index("doctl registry login")
        assert buildx_pos < login_pos, (
            f"setup-buildx-action (pos {buildx_pos}) debe preceder a "
            f"doctl registry login (pos {login_pos})"
        )

    # ── Orden: GC wait antes del push ────────────────────────────────────────

    def test_gc_wait_loop_before_build_push(self):
        """El loop de espera de GC activa debe aparecer ANTES de build-push-action.

        DOCR rechaza pushes con 401 mientras hay un garbage-collection en curso.
        """
        gc_wait_pos = self.workflow.index("garbage-collection list")
        push_pos = self.workflow.index("build-push-action")
        assert gc_wait_pos < push_pos, (
            f"gc-wait (pos {gc_wait_pos}) debe preceder a "
            f"build-push-action (pos {push_pos})"
        )

    # ── Orden: GC start después del push ─────────────────────────────────────

    def test_gc_start_after_build_push(self):
        """'garbage-collection start' debe aparecer DESPUÉS de build-push-action.

        Iniciar GC antes del push bloquea el registry. El GC limpia manifests
        sin tags que quedaron de builds anteriores, no el contenido que se acaba
        de pushear.
        """
        push_pos = self.workflow.index("build-push-action")
        gc_start_pos = self.workflow.index("garbage-collection start")
        assert push_pos < gc_start_pos, (
            f"build-push-action (pos {push_pos}) debe preceder a "
            f"garbage-collection start (pos {gc_start_pos})"
        )

    # ── Configuración del build ───────────────────────────────────────────────

    def test_build_includes_next_public_app_url_build_arg(self):
        """NEXT_PUBLIC_APP_URL debe pasarse como build-arg para que Next.js lo embeba."""
        assert "NEXT_PUBLIC_APP_URL" in self.workflow

    def test_build_uses_registry_cache(self):
        """El build usa caché de registry para acelerar builds incrementales."""
        assert "cache-from: type=registry" in self.workflow
        assert "cache-to: type=registry" in self.workflow

    def test_image_tags_include_sha_and_latest(self):
        """La imagen se tagea con el SHA del commit y con 'latest'."""
        assert "type=sha,prefix=sha-" in self.workflow
        assert "type=raw,value=latest" in self.workflow

    # ── Resiliencia y seguridad ───────────────────────────────────────────────

    def test_build_job_has_timeout(self):
        """El job build tiene timeout-minutes para no colgarse indefinidamente."""
        assert "timeout-minutes:" in self.workflow

    def test_concurrency_prevents_parallel_deploys(self):
        """El grupo de concurrencia evita que dos deploys corran en paralelo."""
        assert "concurrency:" in self.workflow
        assert "cancel-in-progress: true" in self.workflow

    def test_deploy_job_needs_both_build_and_migrate(self):
        """El job deploy espera a que build y migrate terminen antes de arrancar."""
        assert "needs: [build, migrate]" in self.workflow

    def test_e2e_job_runs_after_deploy(self):
        """Los smoke tests E2E corren DESPUÉS del deploy, no en paralelo."""
        assert "needs: deploy" in self.workflow
        assert "smoke.sh" in self.workflow
