"""Tests KAN-101: integración Ollama como proveedor de IA."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_ollama_service_exists():
    assert (REPO_ROOT / "lib" / "ai" / "ollama.ts").exists()

def test_ollama_implements_iaiservice():
    content = read("lib/ai/ollama.ts")
    assert "IAIService" in content
    assert "classifyAndStructure" in content

def test_ollama_uses_openai_compatible_endpoint():
    content = read("lib/ai/ollama.ts")
    assert "v1/chat/completions" in content

def test_ollama_has_timeout():
    content = read("lib/ai/ollama.ts")
    assert "AbortController" in content or "timeout" in content.lower()

def test_provider_factory_exists():
    assert (REPO_ROOT / "lib" / "ai" / "provider.ts").exists()

def test_provider_factory_returns_claude_by_default():
    content = read("lib/ai/provider.ts")
    assert "ClaudeAIService" in content
    assert "claude" in content

def test_provider_factory_returns_ollama():
    content = read("lib/ai/provider.ts")
    assert "OllamaAIService" in content
    assert "ollama" in content

def test_provider_factory_has_auto_fallback():
    content = read("lib/ai/provider.ts")
    assert "auto" in content

def test_capture_uses_provider_factory():
    content = read("features/tickets/server/capture.ts")
    assert "getAIService" in content

def test_schema_has_ai_provider_column():
    content = read("lib/db/schema.ts")
    assert "aiProvider" in content or "ai_provider" in content

def test_schema_has_ollama_model_column():
    content = read("lib/db/schema.ts")
    assert "ollamaModel" in content or "ollama_model" in content

def test_migration_exists():
    migrations = list((REPO_ROOT / "drizzle").glob("0006_*.sql"))
    assert len(migrations) >= 1, "Debe existir migración 0006 para columnas AI provider"

def test_migration_adds_ai_provider():
    migrations = list((REPO_ROOT / "drizzle").glob("0006_*.sql"))
    content = migrations[0].read_text()
    assert "ai_provider" in content

def test_env_has_ollama_base_url():
    content = read("lib/env.ts")
    assert "OLLAMA_BASE_URL" in content

def test_settings_page_has_ai_provider_selector():
    content = read("app/(dashboard)/settings/page.tsx")
    assert "AiProviderSelector" in content or "aiProvider" in content

def test_ai_provider_selector_component_exists():
    assert (REPO_ROOT / "features" / "settings" / "components" / "ai-provider-selector.tsx").exists()

def test_preferences_api_accepts_ai_provider():
    content = read("features/settings/server/service.ts")
    assert "aiProvider" in content

def test_deploy_yml_has_ollama_url():
    content = read(".github/workflows/deploy.yml")
    assert "OLLAMA_BASE_URL" in content
