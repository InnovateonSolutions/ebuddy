import { getLatestCampaignNotes } from './service'

type ChatMessage = {
  role: string
  content?: unknown
}

type ChatBody = {
  messages: ChatMessage[]
}

type CampaignContextNote = {
  title: string
  relativePath: string
  content: string
  links: string[]
  tags: string[]
}

const MAX_NOTES = 5
const MAX_CHARACTERS_PER_NOTE = 1_200

export async function addCampaignContextToChatBody(body: unknown, userId: string): Promise<unknown> {
  if (!isChatBody(body)) return body

  const query = getLastUserText(body.messages)
  if (!query) return body

  const latest = await getLatestCampaignNotes(userId)
  if (!latest || latest.notes.length === 0) return body

  const context = buildCampaignContext(latest.campaign.name, latest.notes, query)
  if (!context) return body

  return {
    ...body,
    messages: [
      { role: 'system', content: context },
      ...body.messages,
    ],
  }
}

function buildCampaignContext(campaignName: string, notes: CampaignContextNote[], query: string): string {
  const ranked = rankNotes(notes, query).slice(0, MAX_NOTES)
  if (ranked.length === 0) return ''

  return [
    `Contexto de campaña DnD: ${campaignName}.`,
    'Usa estas notas como canon del Dungeon Master. Si improvisas fuera del canon, dilo claramente.',
    ...ranked.map((note) => [
      `Nota: ${note.relativePath}`,
      `Titulo: ${note.title}`,
      `Tags: ${note.tags.length > 0 ? note.tags.join(', ') : 'sin tags'}`,
      note.content.slice(0, MAX_CHARACTERS_PER_NOTE).trim(),
    ].join('\n')),
  ].join('\n\n')
}

function isChatBody(value: unknown): value is ChatBody {
  return typeof value === 'object' &&
    value !== null &&
    'messages' in value &&
    Array.isArray((value as { messages?: unknown }).messages)
}

function getLastUserText(messages: ChatMessage[]): string {
  const userMessage = [...messages].reverse().find((message) => message.role === 'user')
  return typeof userMessage?.content === 'string' ? userMessage.content : ''
}

function rankNotes(notes: CampaignContextNote[], query: string): CampaignContextNote[] {
  const terms = normalizeText(query).split(/\s+/).filter((term) => term.length > 2)
  return notes
    .map((note) => ({ note, score: scoreNote(note, terms) }))
    .sort((a, b) => b.score - a.score || a.note.relativePath.localeCompare(b.note.relativePath))
    .map((item) => item.note)
}

function scoreNote(note: CampaignContextNote, terms: string[]): number {
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

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
