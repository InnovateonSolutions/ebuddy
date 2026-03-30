'use client'

import { useState, useRef, useCallback } from 'react'

type RecorderState = 'idle' | 'recording' | 'processing'

interface UseAudioRecorderReturn {
  state: RecorderState
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  error: string | null
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle')
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Elegir el formato más compatible
      const mimeType = getSupportedMimeType()
      const mediaRecorder = new MediaRecorder(stream, { mimeType })

      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100) // chunk cada 100ms
      setState('recording')
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Permiso de micrófono denegado. Habilítalo en la configuración del navegador.'
          : 'No se pudo acceder al micrófono.'
      setError(msg)
    }
  }, [])

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null)
        return
      }

      setState('processing')

      mediaRecorder.onstop = () => {
        // Detener todas las pistas del stream
        mediaRecorder.stream.getTracks().forEach((track) => track.stop())

        const mimeType = getSupportedMimeType()
        const blob = new Blob(chunksRef.current, { type: mimeType })
        chunksRef.current = []
        mediaRecorderRef.current = null
        setState('idle')
        resolve(blob)
      }

      mediaRecorder.stop()
    })
  }, [])

  return { state, startRecording, stopRecording, error }
}

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return 'audio/webm'
}
