import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InfraDashboard } from '@/features/infra/components/infra-dashboard'
import type { InfraSnapshot } from '@/features/infra/server/types'

function buildSnapshot(): InfraSnapshot {
  return {
    droplet: {
      available: true,
      source: 'digitalocean',
      cpu: 22.5,
      ram: { pct: 40, used: 1_600_000_000, total: 4_000_000_000 },
      disk: { pct: 55, used: 44_000_000_000, total: 80_000_000_000 },
      hostId: '123',
      windowMinutes: 30,
    },
    diagnostics: {
      configured: true,
      available: true,
      source: 'prometheus',
      reason: undefined,
      targets: {
        elitemini: {
          label: 'elitemini',
          available: true,
          cpu: 19.2,
          ram: { pct: 43, used: 6_800_000_000, total: 16_000_000_000 },
          disk: { pct: 58, used: 290_000_000_000, total: 500_000_000_000 },
        },
      },
    },
    services: {
      source: 'elitemini',
      openclaw: {
        configured: true,
        available: true,
        baseUrl: 'http://100.80.59.3:18789',
        version: '2026.4.15',
      },
      ollama: {
        configured: true,
        available: true,
        baseUrl: 'http://100.80.59.3:11434',
        version: '0.8.0',
        models: ['llama3:latest', 'qwen3:8b'],
      },
    },
    app: {
      source: 'application',
      health: 'ok',
      db: 'ok',
      activeTickets: 4,
      createdLast24h: 1,
      completedLast7d: 3,
      connectedCalendars: 1,
      lastCaptureAt: '2026-04-21T00:00:00.000Z',
    },
    ts: '2026-04-21T00:00:00.000Z',
  }
}

describe('InfraDashboard', () => {
  it('presenta la consola distribuida separando droplet, app y stack IA del elitemini', () => {
    const html = renderToStaticMarkup(React.createElement(InfraDashboard, { initial: buildSnapshot() }))

    expect(html).toContain('Infraestructura operativa')
    expect(html).toContain('Droplet DO')
    expect(html).toContain('App ebuddy')
    expect(html).toContain('elitemini')
    expect(html).toContain('OpenClaw')
    expect(html).toContain('Ollama')
    expect(html).toContain('Modelos detectados')
  })
})
