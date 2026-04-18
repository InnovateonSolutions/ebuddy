import type { IAIService } from './types'
import { ClaudeAIService } from './claude'
import { OllamaAIService } from './ollama'

export type AIProvider = 'claude' | 'ollama' | 'auto'

export function getAIService(provider: AIProvider = 'claude', ollamaModel?: string): IAIService {
  if (provider === 'ollama') return new OllamaAIService(undefined, ollamaModel)
  if (provider === 'auto') return new AutoAIService(ollamaModel)
  return new ClaudeAIService()
}

// Intenta Ollama; si falla en el primer request, cae a Claude automáticamente
class AutoAIService implements IAIService {
  private ollamaModel?: string

  constructor(ollamaModel?: string) {
    this.ollamaModel = ollamaModel
  }

  async classifyAndStructure(text: string, timezone?: string): Promise<ReturnType<IAIService['classifyAndStructure']> extends Promise<infer T> ? T : never> {
    const available = await OllamaAIService.isAvailable()
    if (available) {
      try {
        return await new OllamaAIService(undefined, this.ollamaModel).classifyAndStructure(text, timezone)
      } catch {
        // fallthrough a Claude
      }
    }
    return new ClaudeAIService().classifyAndStructure(text, timezone)
  }
}
