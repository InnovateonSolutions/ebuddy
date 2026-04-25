import { describe, expect, it } from 'vitest'
import { parseCampaignImport } from './contracts'

describe('campaign import contracts', () => {
  it('acepta notas Markdown de un vault y descarta archivos no soportados', () => {
    const parsed = parseCampaignImport({
      name: 'Ravenloft',
      notes: [
        { relativePath: '03_NPC/Hilda.md', content: '# Hilda\nAliada de [[Vaelthir]] #npc' },
        { relativePath: '00_System/Monster Manual.pdf', content: 'pdf' },
        { relativePath: '.obsidian/workspace.json', content: '{}' },
      ],
    })

    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.name).toBe('Ravenloft')
    expect(parsed.data.notes).toHaveLength(1)
    expect(parsed.data.notes[0]).toEqual(expect.objectContaining({
      title: 'Hilda',
      relativePath: '03_NPC/Hilda.md',
      folder: '03_NPC',
      links: ['Vaelthir'],
      tags: ['npc'],
    }))
  })

  it('rechaza importaciones sin notas validas', () => {
    const parsed = parseCampaignImport({
      name: 'Ravenloft',
      notes: [{ relativePath: '00_System/Monster Manual.pdf', content: 'pdf' }],
    })

    expect(parsed.success).toBe(false)
  })
})
