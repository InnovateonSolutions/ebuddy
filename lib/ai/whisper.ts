import OpenAI from 'openai'
import { env } from '@/lib/env'
import type { ITranscriptionService } from './types'

export class WhisperTranscriptionService implements ITranscriptionService {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({ apiKey: env.openaiApiKey })
  }

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<string> {
    // Whisper necesita un File object con nombre y tipo
    const extension = mimeTypeToExtension(mimeType)
    const audioFile = new File([new Uint8Array(audioBuffer)], `recording.${extension}`, {
      type: mimeType,
    })

    const response = await this.client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es', // optimizado para español
      response_format: 'text',
    })

    if (typeof response !== 'string' || response.trim().length === 0) {
      throw new Error('Whisper devolvió una transcripción vacía')
    }

    return response.trim()
  }
}

function mimeTypeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/flac': 'flac',
  }
  return map[mimeType] ?? 'webm'
}
