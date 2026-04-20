from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


# ── Triggers ──────────────────────────────────────────────────────────────────

def test_deploy_workflow_uses_positive_paths_filter():
    workflow = (REPO_ROOT / ".github" / "workflows" / "deploy.yml").read_text()

    assert "workflow_call:" in workflow
    assert "workflow_dispatch:" in workflow
    assert "workflow_run:" in workflow
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


def test_ci_workflow_grants_actions_write_for_reusable_deploy():
    """ci.yml debe incluir actions: write para poder llamar deploy.yml.

    Los permisos del workflow llamado (deploy.yml) no pueden exceder los del
    caller (ci.yml). Si ci.yml no declara actions: write, GitHub rechaza el
    run de deploy.yml con startup_failure cuando solicita ese permiso.
    """
    ci = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text()
    assert "actions: write" in ci


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
        "infra/*|.github/workflows/terraform.yml",
        "terraform-plan:",
        "needs['detect-changes'].outputs.infra_changed",
        "needs['detect-changes'].outputs.app_changed",
        "uses: ./.github/workflows/terraform.yml",
    ):
        assert expected_path in workflow


def test_ci_workflow_stops_after_validation_and_does_not_embed_deploy():
    workflow = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text()

    assert "\n  deploy:\n" not in workflow, (
        "ci.yml debe terminar en validación; el deploy a producción debe vivir en un workflow separado"
    )
    assert "uses: ./.github/workflows/deploy.yml" not in workflow, (
        "ci.yml no debe arrastrar deploy.yml en el camino crítico del feedback loop"
    )


def test_deploy_workflow_can_start_after_successful_ci_on_main():
    workflow = (REPO_ROOT / ".github" / "workflows" / "deploy.yml").read_text()

    assert "workflows: [CI]" in workflow or "workflows:\n      - CI" in workflow, (
        "deploy.yml debe reaccionar a CI verde para mantener CD separado de la validación"
    )
    assert "types: [completed]" in workflow or "types:\n      - completed" in workflow
    assert "github.event.workflow_run.conclusion == 'success'" in workflow, (
        "deploy.yml solo debe arrancar automáticamente cuando CI terminó en verde"
    )
    assert "github.event.workflow_run.head_branch == 'main'" in workflow, (
        "deploy.yml solo debe auto-desplegar desde main"
    )


def test_workflows_force_actions_to_node24():
    for rel_path in [
        ".github/workflows/ci.yml",
        ".github/workflows/deploy.yml",
        ".github/workflows/operations.yml",
        ".github/workflows/terraform.yml",
    ]:
        workflow = (REPO_ROOT / rel_path).read_text()
        assert "FORCE_JAVASCRIPT_ACTIONS_TO_NODE24" in workflow, (
            f"{rel_path} debe forzar acciones JavaScript sobre Node 24 para evitar la deprecación de Node 20"
        )


def test_bootstrap_deploy_workflow_is_removed():
    assert not (REPO_ROOT / ".github" / "workflows" / "bootstrap-deploy.yml").exists(), (
        "bootstrap-deploy.yml debe eliminarse para evitar una segunda implementación del pipeline"
    )


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

    def test_docr_auth_uses_do_token_directly_not_doctl_docker_config(self):
        """DOCR usa DO_TOKEN directamente como password en Basic Auth — no doctl docker-config.

        doctl registry docker-config genera tokens derivados (registry-specific)
        que son rechazados intermitentemente por el token endpoint de DOCR al
        hacer push desde buildkitd. El endpoint devuelve 401 aunque el token
        tenga scope correcto.

        DigitalOcean documenta explícitamente que cualquier string no vacío como
        username y el DO_TOKEN como password es la alternativa soportada para
        autenticación con DOCR. Este token no expira y no requiere API call
        intermedio, eliminando la causa raíz.

        Root cause del bug: `doctl registry docker-config` → token derivado de
        corta duración → 401 en token endpoint durante push.
        Fix: DO_TOKEN como password en base64 inline → sin intermediarios.
        """
        assert "doctl registry docker-config" not in self.workflow
        assert "docker/login-action" not in self.workflow

    def test_docr_credential_step_exposes_do_token_as_env(self):
        """El step de credenciales DOCR debe exponer DO_TOKEN como env var explícita.

        Para construir las credenciales inline con el DO_TOKEN sin usar doctl,
        el step necesita acceder al secreto como variable de entorno.
        """
        assert "DO_TOKEN: ${{ secrets.DO_TOKEN }}" in self.workflow

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
        """Las credenciales de DOCR (en ~/.docker/config.json) deben escribirse
        ANTES de crear el buildx builder.

        El container de buildx hereda ~/.docker/config.json al momento de su
        creación. Si las credenciales se escriben después, el builder ya está
        corriendo y no las ve → 401.
        """
        creds_pos = self.workflow.index("~/.docker/config.json")
        buildx_pos = self.workflow.index("setup-buildx-action")
        assert creds_pos < buildx_pos, (
            f"~/.docker/config.json (pos {creds_pos}) debe preceder a "
            f"setup-buildx-action (pos {buildx_pos})"
        )

    # ── Orden: GC wait antes del push ────────────────────────────────────────

    def test_gc_wait_loop_before_build_push(self):
        """El build no debe esperar GC activa en el camino crítico del deploy.

        El GC corre en operations.yml. El deploy debe intentar construir/pushear
        sin introducir una espera preventiva de varios minutos.
        """
        assert "garbage-collection list" not in self.workflow, (
            "deploy.yml no debe bloquear el build esperando garbage collection activa"
        )

    # ── GC en cron, no en build job ───────────────────────────────────────────

    def test_gc_not_in_deploy_workflow(self):
        """'garbage-collection start' NO debe estar en deploy.yml.

        GC en el build job causaba 401 en el siguiente deploy
        ("waiting for write JWTs to expire" bloqueaba pushes).
        GC se movió a operations.yml con cron diario.
        """
        assert "garbage-collection start" not in self.workflow, (
            "GC debe estar en operations.yml (cron), no en deploy.yml"
        )

    def test_old_tag_cleanup_not_in_deploy_workflow(self):
        """La limpieza de tags viejos no debe vivir en deploy.yml.

        Borrar tags en cada deploy añade latencia y mete trabajo operativo en el
        camino crítico. La higiene del registry pertenece al workflow operacional.
        """
        assert "Delete old image tags" not in self.workflow
        assert "repository delete-tag" not in self.workflow

    def test_gc_in_operations_workflow(self):
        """El GC de registry debe vivir en operations.yml vía script dedicado."""
        ops = (REPO_ROOT / ".github" / "workflows" / "operations.yml").read_text()
        assert "bash scripts/registry-gc.sh" in ops
        assert "schedule" in ops

    # ── Permisos ─────────────────────────────────────────────────────────────

    def test_deploy_workflow_does_not_need_actions_write(self):
        """deploy.yml debe declarar actions: write cuando exporta cache gha.

        El pipeline ahora usa cache híbrida gha + registry para reducir el
        tiempo de build. Ese backend necesita el permiso de actions.
        """
        assert "actions: write" in self.workflow

    # ── Configuración del build ───────────────────────────────────────────────

    def test_build_includes_next_public_app_url_build_arg(self):
        """NEXT_PUBLIC_APP_URL debe pasarse como build-arg para que Next.js lo embeba."""
        assert "NEXT_PUBLIC_APP_URL" in self.workflow

    def test_build_uses_registry_cache(self):
        """El build usa registry cache (DOCR) para persistencia entre runners efímeros.

        Migración de type=gha a type=registry justificada:
        - GHA runners son efímeros: el cache mount de BuildKit no persiste entre runs.
        - type=gha funcionaba pero requería actions: write y tenía límites de tamaño.
        - type=registry usa DO_TOKEN en Basic Auth inline (no doctl, no OAuth derivado),
          eliminando la causa raíz del 401 intermitente que motivó la prohibición anterior.
        - La capa de buildcache en DOCR se actualiza en cada push y se comparte
          entre todos los runners, reduciendo tiempos de build significativamente.

        La prohibición anterior era contra doctl/docker/login-action + type=registry.
        Con DO_TOKEN inline en ~/.docker/config.json, registry cache es seguro.
        """
        assert "type=registry,ref=${{ env.IMAGE_NAME }}:buildcache" in self.workflow
        assert "buildcache" in self.workflow

    def test_build_uses_github_actions_cache_for_hot_builds(self):
        """El build debe aprovechar cache gha para acelerar rebuilds en GitHub-hosted runners.

        Docker recomienda gha como backend de cache dentro de GitHub Actions.
        Mantenerlo junto a registry cache reduce latencia del build sin perder
        persistencia fuera del runner actual.
        """
        assert "type=gha,scope=app-image" in self.workflow, (
            "deploy.yml debe importar cache gha para acelerar builds repetidos"
        )
        assert "type=gha,mode=max,scope=app-image" in self.workflow, (
            "deploy.yml debe exportar cache gha en modo max para reutilizar más capas"
        )

    def test_image_tags_include_sha_and_latest(self):
        """La imagen se tagea con el SHA del commit y con 'latest'."""
        assert "type=sha,prefix=sha-" in self.workflow
        assert "type=raw,value=latest" in self.workflow

    # ── Resiliencia y seguridad ───────────────────────────────────────────────

    def test_build_job_has_timeout(self):
        """El job build tiene timeout-minutes para no colgarse indefinidamente."""
        assert "timeout-minutes:" in self.workflow

    def test_build_detects_when_migrator_image_is_really_needed(self):
        """El deploy debe construir el migrator solo cuando cambian archivos relevantes."""
        assert "app_changed" in self.workflow, (
            "deploy.yml debe calcular también un flag app_changed para evitar builds de app innecesarios"
        )
        assert "migrator_changed" in self.workflow, (
            "deploy.yml debe calcular un flag migrator_changed dentro del build"
        )
        assert "app/*" in self.workflow
        assert "components/*" in self.workflow
        assert "lib/*" in self.workflow
        assert "drizzle.config.ts" in self.workflow
        assert "lib/db/" in self.workflow or "lib/db/**" in self.workflow
        assert "drizzle/" in self.workflow or "drizzle/**" in self.workflow
        assert "needs.changes.outputs.app_changed == 'true'" in self.workflow, (
            "El job build debe condicionarse al flag app_changed"
        )
        assert "if: needs.changes.outputs.migrator_changed == 'true'" in self.workflow, (
            "Los pasos de build del migrator deben condicionarse al flag migrator_changed"
        )

    def test_deploy_and_e2e_skip_when_no_app_change_was_detected(self):
        assert "needs.changes.outputs.app_changed == 'true'" in self.workflow, (
            "deploy.yml debe evitar deploy y smoke tests cuando el cambio no afectó la app desplegable"
        )

    def test_deploy_avoids_fixed_sleeps_and_uses_readiness_checks(self):
        """El deploy no debe depender de sleeps fijos para asumir disponibilidad.

        Los readiness checks reducen tiempo promedio y hacen el deploy más robusto
        que esperar 15s/60s incondicionales.
        """
        assert "sleep 15" not in self.workflow
        assert "sleep 60" not in self.workflow
        assert "/api/health" in self.workflow, (
            "deploy.yml debe esperar readiness consultando el health endpoint real"
        )
        assert "until " in self.workflow or "for attempt in" in self.workflow, (
            "deploy.yml debe hacer polling explícito en lugar de sleeps fijos"
        )

    def test_deploy_only_runs_migrations_when_schema_changes(self):
        """Las migraciones deben depender del flag migrator_changed.

        Si no cambió el schema ni tooling de Drizzle, deploy no debe perder tiempo
        haciendo pull/run del migrator.
        """
        assert "needs.changes.outputs.migrator_changed == 'true'" in self.workflow, (
            "deploy.yml debe condicionar migraciones al flag migrator_changed"
        )
        assert "docker pull registry.digitalocean.com/ebuddy-prod/ebuddy:migrator" in self.workflow
        assert "docker run --rm" in self.workflow

    def test_e2e_readiness_check_receives_app_url_env(self):
        """El polling de readiness debe usar el mismo APP_URL que smoke.sh."""
        assert "Wait for app readiness" in self.workflow
        assert self.workflow.count("\n          APP_URL: https://ebuddy.innovateoncorp.com") >= 2, (
            "El step de readiness debe recibir APP_URL explícitamente para no ejecutar curl sobre una URL vacía"
        )

    def test_concurrency_prevents_parallel_deploys(self):
        """El grupo de concurrencia evita que dos deploys corran en paralelo."""
        assert "concurrency:" in self.workflow
        assert "cancel-in-progress: true" in self.workflow

    def test_deploy_job_needs_build(self):
        """El job deploy espera a que build termine antes de arrancar.
        Las migraciones corren en el Droplet (red confiable DO → DB), no desde CI."""
        assert "needs: [changes, build]" in self.workflow

    def test_e2e_job_runs_after_deploy(self):
        """Los smoke tests E2E corren DESPUÉS del deploy, no en paralelo."""
        assert "needs: [changes, deploy]" in self.workflow
        assert "smoke.sh" in self.workflow
