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


def test_ci_components_path_triggers_app_changed():
    """Cambios en components/ deben ser detectados como app_changed=true.

    Caso borde explícitamente solicitado: el path estaba en el patrón pero
    sin cobertura de test. components/* debe estar en el mismo case arm
    que establece app_changed, no en infra ni scripts.
    """
    ci = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text()

    # El glob components/* debe aparecer junto a app/* en el mismo case arm
    assert "app/*|components/*" in ci

    # Verificar que no está mezclado con los arms de infra o scripts
    infra_arm_pos = ci.index("infra_changed=true")
    scripts_arm_pos = ci.index("scripts_changed=true")
    app_arm_pos = ci.index("app_changed=true")
    components_pos = ci.index("components/*")

    assert abs(components_pos - app_arm_pos) < abs(components_pos - infra_arm_pos), (
        "components/* está más cerca de infra_changed=true que de app_changed=true"
    )
    assert abs(components_pos - app_arm_pos) < abs(components_pos - scripts_arm_pos), (
        "components/* está más cerca de scripts_changed=true que de app_changed=true"
    )


def test_ci_deploy_workflow_changes_trigger_app_changed():
    """Cambios en deploy.yml deben disparar app_changed=true y un deploy real.

    Gap descubierto: al cambiar deploy.yml sin tocar código de app, el deploy
    era skipped y había que hacer workflow_dispatch manual para validarlo.
    """
    ci = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text()

    app_arm_pos = ci.index("app_changed=true")
    deploy_yml_pos = ci.index(".github/workflows/deploy.yml")

    assert deploy_yml_pos < app_arm_pos, (
        ".github/workflows/deploy.yml debe estar en el case arm de app_changed"
    )


def test_ci_ci_workflow_changes_trigger_scripts_changed():
    """Cambios en ci.yml deben disparar scripts_changed=true y correr pytest.

    Garantiza que modificar el propio CI siempre ejercita los tests
    estructurales que lo protegen.
    """
    ci = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text()

    scripts_arm_pos = ci.index("scripts_changed=true")
    ci_yml_pos = ci.index(".github/workflows/ci.yml")

    assert ci_yml_pos < scripts_arm_pos, (
        ".github/workflows/ci.yml debe estar en el case arm de scripts_changed"
    )


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

    def test_docr_uses_doctl_docker_config_not_login_action(self):
        """DOCR usa doctl registry docker-config para escribir credenciales estáticas.

        docker/login-action en Ubuntu almacena las credenciales en el credential
        store del sistema (secretservice/pass). Buildkitd corriendo dentro del
        container del buildx driver no puede acceder a ese store → 401 al pushear.

        doctl registry docker-config escribe un JSON estático a stdout con el
        auth en base64 inline, sin credential helpers. Escribirlo directamente
        a ~/.docker/config.json garantiza que buildkitd lo lea correctamente.
        """
        assert "doctl registry docker-config" in self.workflow
        assert "docker/login-action" not in self.workflow

    def test_docr_does_not_use_doctl_registry_login(self):
        """doctl registry login NO se usa como step de autenticación de DOCR.

        doctl registry login configura el credential helper 'docker-credential-doctl'
        en ~/.docker/config.json (en lugar de credenciales inline). Buildkitd dentro
        del container de buildx no puede ejecutar ese binario del host → 401.
        """
        import re
        run_steps = re.findall(r'^\s+run:.*doctl registry login', self.workflow, re.MULTILINE)
        assert len(run_steps) == 0, f"doctl registry login no debe ser un run: step, encontrado: {run_steps}"

    # ── Orden: credenciales ANTES que buildx ─────────────────────────────────

    def test_docr_credential_config_before_setup_buildx(self):
        """Las credenciales de DOCR deben escribirse ANTES de crear el buildx builder.

        El container de buildx hereda ~/.docker/config.json al momento de su
        creación. Si las credenciales se escriben después, el builder ya está
        corriendo y no las ve → 401.
        """
        creds_pos = self.workflow.index("doctl registry docker-config")
        buildx_pos = self.workflow.index("setup-buildx-action")
        assert creds_pos < buildx_pos, (
            f"doctl registry docker-config (pos {creds_pos}) debe preceder a "
            f"setup-buildx-action (pos {buildx_pos})"
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

    def test_build_uses_gha_cache(self):
        """El build usa GitHub Actions cache en lugar de registry cache.

        type=gha evita el token refresh de OAuth que causaba 401 intermitentes
        con DOCR al hacer pull del buildcache durante la fase de build.
        type=registry queda prohibido para prevenir regresión.
        """
        assert "cache-from: type=gha" in self.workflow
        assert "cache-to: type=gha" in self.workflow
        assert "cache-from: type=registry" not in self.workflow

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
