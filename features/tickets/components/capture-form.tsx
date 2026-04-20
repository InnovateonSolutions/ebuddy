'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Send, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { cn } from '@/lib/utils'
import type { ApiResponse, Ticket } from '@/lib/types'

interface CaptureFormProps {
  onTicketCreated?: (ticket: Ticket) => void
}

export default function CaptureForm({ onTicketCreated }: CaptureFormProps) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { state: recorderState, startRecording, stopRecording, error: recorderError } = useAudioRecorder()

  const isRecording = recorderState === 'recording'
  const isProcessing = recorderState === 'processing' || submitting

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || isProcessing) return

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/tickets/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const json: ApiResponse<Ticket> = await res.json()

      if (json.success) {
        setText('')
        onTicketCreated?.(json.data)
      } else {
        setError(json.error)
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVoiceToggle() {
    if (isRecording) {
      // Detener y enviar
      const audioBlob = await stopRecording()
      if (!audioBlob || audioBlob.size === 0) return

      setSubmitting(true)
      setError(null)

      try {
        const formData = new FormData()
        formData.append('audio', audioBlob, 'recording.webm')

        const res = await fetch('/api/tickets/capture', {
          method: 'POST',
          body: formData,
        })
        const json: ApiResponse<Ticket> = await res.json()

        if (json.success) {
          onTicketCreated?.(json.data)
        } else {
          setError(json.error)
        }
      } catch {
        setError('Error al procesar el audio.')
      } finally {
        setSubmitting(false)
      }
    } else {
      await startRecording()
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <form onSubmit={handleTextSubmit} className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="¿Qué tienes en mente? Escríbelo aquí o usa el micrófono..."
          rows={2}
          disabled={isProcessing || isRecording}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleTextSubmit(e as unknown as React.FormEvent)
            }
          }}
          className="border-0 bg-transparent px-0 focus-visible:ring-0 resize-none text-base placeholder:text-slate-400"
        />

        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          {/* Estado */}
          <div className="text-xs text-slate-400">
            {isRecording && (
              <span className="flex items-center gap-1.5 text-red-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Grabando... Presiona para detener
              </span>
            )}
            {recorderState === 'processing' && (
              <span className="flex items-center gap-1.5 text-blue-500">
                <Loader2 size={12} className="animate-spin" />
                Transcribiendo...
              </span>
            )}
            {submitting && recorderState === 'idle' && (
              <span className="flex items-center gap-1.5 text-blue-500">
                <Loader2 size={12} className="animate-spin" />
                Procesando con IA...
              </span>
            )}
            {!isRecording && !isProcessing && text.length > 0 && (
              <span>Ctrl+Enter para enviar</span>
            )}
          </div>

          {/* Botones */}
          <div className="flex items-center gap-2">
            {/* Micrófono */}
            <button
              type="button"
              onClick={handleVoiceToggle}
              disabled={submitting && !isRecording}
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-xl transition-all',
                isRecording
                  ? 'bg-red-500 text-white recording-pulse'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Enviar texto */}
            <Button
              type="submit"
              size="sm"
              disabled={!text.trim() || isProcessing}
              className="gap-1.5"
            >
              {submitting && recorderState === 'idle' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Capturar
            </Button>
          </div>
        </div>
      </form>

      {(error || recorderError) && (
        <p className="text-xs text-red-500 mt-2 px-1">{error ?? recorderError}</p>
      )}
    </div>
  )
}
