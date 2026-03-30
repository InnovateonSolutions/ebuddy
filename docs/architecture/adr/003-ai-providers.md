# ADR 003 — OpenAI Whisper + Anthropic Claude como Proveedores de IA

**Estado:** Aceptado
**Fecha:** Marzo 2026
**Autor:** Martín Cuevas Tavizón

---

## Contexto

El core del valor de ebuddy está en dos operaciones de IA:
1. **Transcripción de voz a texto** — debe soportar español con buena precisión en vocabulario de negocios.
2. **Clasificación y estructuración** — debe producir JSON consistente, siguiendo instrucciones precisas sin alucinaciones en el formato.

Ambas operaciones deben completarse juntas en < 5 segundos (P95).

## Decisión

### Transcripción: OpenAI Whisper API

| Candidato | WER español | Latencia | Costo |
|---|---|---|---|
| **Whisper API (elegido)** | ~5-8% | ~1-2s para 30s audio | $0.006/min |
| Google Speech-to-Text | ~6-10% | ~1-3s | $0.016/min |
| AWS Transcribe | ~8-12% | ~2-4s | $0.024/min |
| Whisper self-hosted | Similar | Variable | Costo infra |

Whisper tiene el mejor balance WER/costo/latencia para español. A $0.006/min, 100 grabaciones de 30s = $0.30 — irrelevante en MVP.

### Clasificación: Anthropic Claude (claude-sonnet-4-6)

| Candidato | JSON consistency | Instruction following | Costo input/output |
|---|---|---|---|
| **Claude Sonnet 4.6 (elegido)** | Excelente | Excelente | $3/$15 por MTok |
| GPT-4o | Muy bueno | Muy bueno | $5/$15 por MTok |
| GPT-4o-mini | Bueno | Bueno | $0.15/$0.60 por MTok |
| Gemini 1.5 Flash | Bueno | Bueno | $0.075/$0.30 por MTok |

Claude Sonnet 4.6 produce JSON estructurado más consistente con instrucciones complejas. El costo en MVP de 1 usuario es trivial: ~200 tickets/mes × ~500 tokens/ticket = 100k tokens → ~$0.30/mes.

### Abstracción de interfaces

Ambos proveedores están encapsulados detrás de interfaces:
- `ITranscriptionService` → `WhisperTranscriptionService`
- `IAIService` → `ClaudeAIService`

Si se necesita cambiar proveedor (costos, disponibilidad, performance), solo se reemplaza la implementación.

## Consecuencias

**Positivas:**
- Whisper maneja múltiples acentos de español sin configuración adicional.
- Claude produce JSON válido con Zod validation — tasa de fallos por formato < 1%.
- Costo total de IA en MVP: < $1/mes para uso personal intensivo.
- Interfaces permiten A/B testing entre proveedores en el futuro.

**Negativas / Riesgos aceptados:**
- Dos vendors externos con sus propios SLAs. Si OpenAI o Anthropic tienen downtime, la captura de tickets falla.
- Latencia P95 depende de la carga de los proveedores. Configurar timeout de 30s como fallback claro.
- Los datos de texto del usuario se envían a APIs externas. Documentado en política de privacidad futura.

## Criterio de revisión

Si el costo de IA supera $20/mes (indicativo de uso intensivo o bug de loops), revisar logs para identificar llamadas anómalas antes de cambiar proveedor.
