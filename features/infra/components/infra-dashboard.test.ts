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
      configured: false,
      available: false,
      source: 'prometheus',
      reason: 'Diagnóstico avanzado opcional no configurado',
      targets: {
        elitemini: { label: 'elitemini', available: false, reason: 'No configurado' },
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
  it('no muestra node_exporter como requisito cuando el diagnóstico opcional no está configurado', () => {
    const html = renderToStaticMarkup(React.createElement(InfraDashboard, { initial: buildSnapshot() }))

    expect(html).toContain('Fuente oficial: DigitalOcean Monitoring')
    expect(html).not.toContain('Reachability de Prometheus + node_exporter')
    expect(html).not.toContain('Node Exporter no alcanzable')
    expect(html).toContain('Diagnóstico avanzado opcional')
  })
})
