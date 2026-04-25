import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'

const tempRoots: string[] = []

async function makeVault() {
  const root = await mkdtemp(join(tmpdir(), 'ebuddy-obsidian-'))
  tempRoots.push(root)
  await mkdir(join(root, '03_NPC'), { recursive: true })
  await mkdir(join(root, '00_System'), { recursive: true })
  await mkdir(join(root, '.obsidian'), { recursive: true })
  await writeFile(join(root, '03_NPC', 'Hilda.md'), [
    '# Hilda',
    '',
    'Aliada de [[Vaelthir]] con el tag #npc.',
  ].join('\n'))
  await writeFile(join(root, '00_System', 'Monster Manual.pdf'), 'pdf')
  await writeFile(join(root, '.obsidian', 'workspace.json'), '{}')
  return root
}

describe('obsidian campaign vault', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
  })

  it('lee solo notas Markdown utiles del vault', async () => {
    const vaultPath = await makeVault()
    const { readObsidianVault } = await import('./obsidian')

    const result = await readObsidianVault({ vaultPath })

    expect(result.notes).toHaveLength(1)
    expect(result.notes[0]).toEqual(expect.objectContaining({
      title: 'Hilda',
      relativePath: '03_NPC/Hilda.md',
      folder: '03_NPC',
      links: ['Vaelthir'],
      tags: ['npc'],
    }))
  })

  it('arma contexto acotado con las notas mas relevantes para la pregunta', async () => {
    const vaultPath = await makeVault()
    const { buildObsidianCampaignContext } = await import('./obsidian')

    const context = await buildObsidianCampaignContext({
      vaultPath,
      query: 'Que sabe Hilda de Vaelthir?',
      maxNotes: 1,
      maxCharactersPerNote: 80,
    })

    expect(context).toContain('Contexto de Obsidian para Dungeon Master')
    expect(context).toContain('03_NPC/Hilda.md')
    expect(context).toContain('Aliada de [[Vaelthir]]')
    expect(context).not.toContain('Monster Manual.pdf')
  })
})
