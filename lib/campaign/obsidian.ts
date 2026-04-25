import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, sep } from 'node:path'
import { env } from '@/lib/env'

export type ObsidianNote = {
  title: string
  relativePath: string
  folder: string
  content: string
  links: string[]
  tags: string[]
}

export type ObsidianVault = {
  vaultPath: string
  notes: ObsidianNote[]
}

type ReadVaultOptions = {
  vaultPath: string
  maxFileBytes?: number
}

type CampaignContextOptions = ReadVaultOptions & {
  query: string
  maxNotes?: number
  maxCharactersPerNote?: number
}

type ChatMessage = {
  role: string
  content?: unknown
}

type ChatBody = {
  messages: ChatMessage[]
}

const DEFAULT_MAX_FILE_BYTES = 80_000
const DEFAULT_MAX_NOTES = 5
const DEFAULT_MAX_CHARACTERS_PER_NOTE = 1_200
const HIDDEN_OR_SYSTEM_DIRS = new Set(['.git', '.obsidian', '.trash', 'node_modules'])

export async function readObsidianVault(options: ReadVaultOptions): Promise<ObsidianVault> {
  const notes: ObsidianNote[] = []

  async function visit(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.') || HIDDEN_OR_SYSTEM_DIRS.has(entry.name)) continue

      const absolutePath = join(directory, entry.name)
      if (entry.isDirectory()) {
        await visit(absolutePath)
        continue
      }

      if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.md') continue

      const content = await readLimitedTextFile(absolutePath, options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES)
      const relativePath = normalizePath(relative(options.vaultPath, absolutePath))
      notes.push({
        title: extractTitle(content, entry.name),
        relativePath,
        folder: normalizePath(dirname(relativePath)),
        content,
        links: extractLinks(content),
        tags: extractTags(content),
      })
    }
  }

  await visit(options.vaultPath)
  notes.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
  return { vaultPath: options.vaultPath, notes }
}

export async function buildObsidianCampaignContext(options: CampaignContextOptions): Promise<string> {
  const vault = await readObsidianVault(options)
  const selectedNotes = rankNotes(vault.notes, options.query).slice(0, options.maxNotes ?? DEFAULT_MAX_NOTES)
  if (selectedNotes.length === 0) return ''

  const maxCharacters = options.maxCharactersPerNote ?? DEFAULT_MAX_CHARACTERS_PER_NOTE
  const renderedNotes = selectedNotes.map((note) => [
    `Nota: ${note.relativePath}`,
    `Titulo: ${note.title}`,
    `Tags: ${note.tags.length > 0 ? note.tags.join(', ') : 'sin tags'}`,
    note.content.slice(0, maxCharacters).trim(),
  ].join('\n'))

  return [
    'Contexto de Obsidian para Dungeon Master.',
    'Usa estas notas como canon de campania. Si una respuesta requiere inventar algo fuera del canon, dilo claramente.',
    ...renderedNotes,
  ].join('\n\n')
}

export async function addObsidianContextToChatBody(body: unknown): Promise<unknown> {
  if (!env.obsidianVaultPath || !isChatBody(body)) return body

  const query = getLastUserText(body.messages)
  if (!query) return body

  try {
    const context = await buildObsidianCampaignContext({
      vaultPath: env.obsidianVaultPath,
      query,
    })
    if (!context) return body

    return {
      ...body,
      messages: [
        { role: 'system', content: context },
        ...body.messages,
      ],
    }
  } catch {
    return body
  }
}

function isChatBody(value: unknown): value is ChatBody {
  return typeof value === 'object' &&
    value !== null &&
    'messages' in value &&
    Array.isArray((value as { messages?: unknown }).messages)
}

async function readLimitedTextFile(path: string, maxFileBytes: number): Promise<string> {
  const content = await readFile(path, 'utf8')
  return content.length > maxFileBytes ? content.slice(0, maxFileBytes) : content
}

function extractTitle(content: string, filename: string): string {
  const heading = content.split('\n').find((line) => line.startsWith('# '))
  if (heading) return heading.replace(/^#\s+/, '').trim()
  return basename(filename, extname(filename))
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

function rankNotes(notes: ObsidianNote[], query: string): ObsidianNote[] {
  const terms = normalizeText(query).split(/\s+/).filter((term) => term.length > 2)
  return notes
    .map((note) => ({ note, score: scoreNote(note, terms) }))
    .sort((a, b) => b.score - a.score || a.note.relativePath.localeCompare(b.note.relativePath))
    .map((item) => item.note)
}

function scoreNote(note: ObsidianNote, terms: string[]): number {
  const title = normalizeText(note.title)
  const path = normalizeText(note.relativePath)
  const content = normalizeText(note.content)
  return terms.reduce((score, term) => {
    if (title.includes(term)) return score + 8
    if (path.includes(term)) return score + 5
    if (content.includes(term)) return score + 1
    return score
  }, 0)
}

function getLastUserText(messages: ChatMessage[]): string {
  const userMessage = [...messages].reverse().find((message) => message.role === 'user')
  return typeof userMessage?.content === 'string' ? userMessage.content : ''
}

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function normalizePath(value: string): string {
  return value === '.' ? '' : value.split(sep).join('/')
}
