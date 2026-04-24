"""Tests estructurales para endurecer AGENTS.md como contrato vivo del repo."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_agents_requires_single_organizational_convention():
    content = read("AGENTS.md")

    assert "No recrear archivos en `types/` ni `hooks/`." in content
    assert "Si aparece una excepción nueva, primero se actualiza `AGENTS.md`" in content, (
        "AGENTS.md debe obligar a documentar cambios de convención antes de introducir excepciones"
    )
    assert "Todo helper reutilizable nuevo vive en `lib/`" in content, (
        "AGENTS.md debe blindar `lib/` como única casa de lógica compartida"
    )
    assert "si la lógica pertenece claramente a un dominio y solo se reutiliza dentro de ese dominio" in content, (
        "AGENTS.md debe aclarar cuándo una pieza debe quedarse en features y no subir a lib"
    )


def test_agents_requires_navigation_consistency_between_public_and_private_surfaces():
    content = read("AGENTS.md")

    assert "Las rutas autenticadas comparten un único patrón de navegación" in content, (
        "AGENTS.md debe prohibir layouts o navbars paralelas para superficies privadas"
    )
    assert "No mezclar `PublicNav` dentro de rutas protegidas" in content, (
        "AGENTS.md debe dejar explícita la separación entre navegación pública y autenticada"
    )


def test_agents_requires_product_copy_to_match_real_runtime_state():
    content = read("AGENTS.md")

    assert "La landing, login, status y settings deben describir el mismo estado real del producto" in content, (
        "AGENTS.md debe exigir consistencia narrativa entre superficies públicas y operativas"
    )
    assert "Eliminar mensajes legacy de \"despliegue inicial\"" in content, (
        "AGENTS.md debe impedir copy desactualizado que degrade la confianza del producto"
    )


def test_agents_requires_single_language_for_user_facing_labels():
    content = read("AGENTS.md")

    assert "Todo texto visible al usuario debe mantener el mismo idioma base por superficie" in content, (
        "AGENTS.md debe evitar mezclar ingles y español en una misma experiencia"
    )
    assert "No introducir labels de estados en inglés si la UI de esa vista está en español" in content, (
        "AGENTS.md debe fijar una regla concreta para estados y labels"
    )


def test_agents_requires_openclaw_installation_to_be_managed_by_ansible():
    content = read("AGENTS.md")

    assert "Toda instalación, upgrade, bootstrap o cambio persistente de configuración de OpenClaw debe gestionarse vía Ansible" in content, (
        "AGENTS.md debe dejar Ansible como fuente de verdad para instalación y configuración persistente de OpenClaw"
    )
    assert "Los comandos `openclaw ...` en shell se permiten solo para:" in content, (
        "AGENTS.md debe distinguir entre diagnóstico temporal y configuración persistente de OpenClaw"
    )


def test_agents_prioritizes_iterative_execution_over_full_context_dump():
    content = read("AGENTS.md")

    assert "AGENTS.md no intenta capturar todo el contexto del sistema." in content, (
        "AGENTS.md debe dejar claro que su objetivo es orientar la ejecución, no reemplazar toda la documentación"
    )
    assert "La meta es dar a cualquier agente una guía corta para iterar con seguridad" in content, (
        "AGENTS.md debe favorecer iteración sana y bajo costo de contexto"
    )
    assert "Bucle corto por turno" in content, (
        "AGENTS.md debe incluir un bucle operativo corto para orientar cada turno"
    )
    assert "Matriz mínima de validación" in content, (
        "AGENTS.md debe mapear checks por tipo de cambio"
    )
    assert "No releer secciones `REFERENCIA` salvo que el cambio toque directamente ese ámbito." in content, (
        "AGENTS.md debe desalentar cargar referencia pesada por defecto"
    )


def test_agents_defines_when_to_escalate_rather_than_guess():
    content = read("AGENTS.md")

    assert "Cuándo escalar antes de seguir" in content
    assert "cambia arquitectura, permisos, runtime, deploy o seguridad" in content, (
        "AGENTS.md debe dejar explícito cuándo no conviene seguir asumiendo"
    )


def test_agents_defines_automation_boundaries():
    content = read("AGENTS.md")

    assert "## [SIEMPRE] Convención de automatización" in content
    assert "GitHub Actions es solo orquestador" in content
    assert "Bash es glue operativo" in content
    assert "Python y Go se usan para testing o ejecución" in content
    assert "No esconder lógica compleja dentro de YAML" in content


def test_agents_separates_always_conditional_and_reference_layers():
    content = read("AGENTS.md")

    assert "## Mapa de lectura rápida" in content
    assert "`SIEMPRE`" in content
    assert "`CONDICIONAL`" in content
    assert "`REFERENCIA`" in content
    assert "## [SIEMPRE] Reglas no negociables" in content
    assert "## [CONDICIONAL] Pipeline de desarrollo obligatorio" in content
    assert "## [REFERENCIA] OpenClaw — Integración de mensajería" in content


def test_agents_root_points_to_dedicated_reference_docs_for_heavy_runtime_detail():
    content = read("AGENTS.md")

    assert "docs/operations/deploy-runtime-reference.md" in content
    assert "docs/operations/openclaw-runtime-reference.md" in content
    assert "Para edge cases de deploy, migraciones y diagnóstico de producción, abrir" in content
    assert "Abrir detalle completo en `docs/operations/openclaw-runtime-reference.md`." in content


def test_agents_declares_minimal_definition_of_done_and_pipeline_scope():
    content = read("AGENTS.md")

    assert "## [SIEMPRE] Definition of Done mínima" in content
    assert "la validación proporcional al cambio está en verde" in content
    assert "si el objetivo del turno ya es subir cambios, la suite completa relevante ya corrió localmente" in content
    assert "no hay scope creep respecto al requerimiento actual" in content
    assert "usar este pipeline completo como camino por defecto para cambios de implementación" in content
    assert "Si la tarea es solo análisis," in content
    assert "basta con validación proporcional." in content
    assert "si el objetivo incluye integración completa, el trabajo no termina en verde local" in content


def test_agents_root_stays_compact_and_avoids_heavy_reference_tables():
    content = read("AGENTS.md")

    assert "## [REFERENCIA] Stack tecnológico" not in content
    assert "## [REFERENCIA] Estructura de tests estructurales" not in content
    assert "## [REFERENCIA] Entorno local para Jira" not in content
    assert "| Módulo | Responsabilidad |" not in content
    assert "| Archivo eliminado | Razón | Reemplazado por |" not in content


def test_agents_requires_full_local_validation_before_push_and_pipeline_follow_through():
    content = read("AGENTS.md")

    assert "Cuando la tarea ya va a milestone de push: correr la validación completa relevante del repo" in content
    assert "continuar hasta revisar el pipeline y hacer troubleshooting básico del fallo antes de dar la tarea por cerrada" in content
