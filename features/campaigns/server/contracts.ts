import { z } from 'zod'

const MAX_NOTE_CHARS = 80_000
const HIDDEN_PATH_PARTS = new Set(['.obsidian', '.git', '.trash', 'node_modules'])

const rawNoteSchema = z.object({
  relativePath: z.string().min(1).max(500),
  content: z.string().max(MAX_NOTE_CHARS),
})

const rawImportSchema = z.object({
  name: z.string().trim().min(1).max(120),
  notes: z.array(rawNoteSchema).max(1_000),
})

export type CampaignImportInput = z.input<typeof rawImportSchema>

export type NormalizedCampaignNote = {
  title: string
  relativePath: string
  folder: string
  content: string
  links: string[]
  tags: string[]
}

export type NormalizedCampaignImport = {
  name: string
  notes: NormalizedCampaignNote[]
}

export function parseCampaignImport(input: unknown):
  | { success: true; data: NormalizedCampaignImport }
  | { success: false; message: string } {
  const parsed = rawImportSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0]?.message ?? 'Importación inválida' }
  }

  const notes = parsed.data.notes
    .filter((note) => isSupportedMarkdownPath(note.relativePath))
    .map((note) => normalizeNote(note.relativePath, note.content))
    .filter((note) => note.content.trim().length > 0)

  if (notes.length === 0) {
    return { success: false, message: 'El vault no contiene notas Markdown válidas' }
  }

  return {
    success: true,
    data: {
      name: parsed.data.name.trim(),
      notes,
    },
  }
}

export function normalizeNote(relativePath: string, content: string): NormalizedCampaignNote {
  const path = normalizeRelativePath(relativePath)
  const folder = path.includes('/') ? path.split('/').slice(0, -1).join('/') : ''
  return {
    title: extractTitle(content, path),
    relativePath: path,
    folder,
    content: content.slice(0, MAX_NOTE_CHARS),
    links: extractLinks(content),
    tags: extractTags(content),
  }
}

function isSupportedMarkdownPath(relativePath: string): boolean {
  const path = normalizeRelativePath(relativePath)
  const parts = path.split('/')
  if (parts.some((part) => part.startsWith('.') || HIDDEN_PATH_PARTS.has(part))) return false
  return path.toLowerCase().endsWith('.md')
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+/, '')
}

function extractTitle(content: string, relativePath: string): string {
  const heading = content.split('\n').find((line) => line.startsWith('# '))
  if (heading) return heading.replace(/^#\s+/, '').trim()
  const filename = relativePath.split('/').pop() ?? relativePath
  return filename.replace(/\.md$/i, '')
}

function extractLinks(content: string): string[] {
  const links = new Set<string>()
  const pattern = /\[\[([^\]#|]+)(?:[#|][^\]]*)?\]\]/g
  let match = pattern.exec(content)
  while (match) {
    links.add(match[1].trim())
    match = pattern.exec(content)
  }
  return Array.from(links).sort((a, b) => a.localeCompare(b))
}

function extractTags(content: string): string[] {
  const tags = new Set<string>()
  const pattern = /(^|\s)#([A-Za-z0-9_\-/À-ÿ]+)/g
  let match = pattern.exec(content)
  while (match) {
    tags.add(match[2])
    match = pattern.exec(content)
  }
  return Array.from(tags).sort((a, b) => a.localeCompare(b))
}
