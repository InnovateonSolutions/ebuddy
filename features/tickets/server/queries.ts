import { and, asc, desc, eq, gt, ilike, isNull, lt, ne, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tickets, userPreferences } from '@/lib/db/schema'
import type { FutureResponse, Ticket, TodayResponse } from '@/lib/types'
import { todayInTimezone } from '@/lib/utils'

const DEFAULT_TIMEZONE = 'America/Tijuana'
const FUTURE_PAGE_SIZE = 20
const SEARCH_LIMIT = 20

const notArchived = eq(tickets.archived, false)

type FutureCursorPayload = {
  dueDate: string | null
  createdAt: string
  id: string
}

export class InvalidFutureCursorError extends Error {
  constructor() {
    super('Cursor inválido')
    this.name = 'InvalidFutureCursorError'
  }
}

function encodeFutureCursor(ticket: Pick<Ticket, 'dueDate' | 'createdAt' | 'id'>): string {
  const payload: FutureCursorPayload = {
    dueDate: ticket.dueDate ?? null,
    createdAt: ticket.createdAt.toISOString(),
    id: ticket.id,
  }

  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export function decodeFutureCursor(cursor: string): FutureCursorPayload {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8')
    const parsed = JSON.parse(raw) as Partial<FutureCursorPayload>

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.createdAt !== 'string' ||
      !('dueDate' in parsed) ||
      (parsed.dueDate !== null && typeof parsed.dueDate !== 'string') ||
      Number.isNaN(new Date(parsed.createdAt).getTime())
    ) {
      throw new Error('invalid')
    }

    return {
      dueDate: parsed.dueDate,
      createdAt: parsed.createdAt,
      id: parsed.id,
    }
  } catch {
    throw new InvalidFutureCursorError()
  }
}

function buildFutureCursorFilter(cursor: FutureCursorPayload | null) {
  if (!cursor) return undefined

  const createdAt = new Date(cursor.createdAt)
  const sameDateTail = or(
    lt(tickets.createdAt, createdAt),
    and(eq(tickets.createdAt, createdAt), lt(tickets.id, cursor.id))
  )

  if (cursor.dueDate === null) {
    return and(isNull(tickets.dueDate), sameDateTail)
  }

  return or(
    gt(tickets.dueDate, cursor.dueDate),
    isNull(tickets.dueDate),
    and(eq(tickets.dueDate, cursor.dueDate), sameDateTail)
  )
}

function splitTicketsByContext(ticketList: Ticket[]): TodayResponse['tickets'] {
  return {
    negocio: ticketList.filter((ticket) => ticket.context === 'NEGOCIO'),
    personal: ticketList.filter((ticket) => ticket.context === 'PERSONAL'),
  }
}

export async function getUserTimezone(userId: string): Promise<string> {
  const prefs = await db
    .select({ timezone: userPreferences.timezone })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)

  return prefs[0]?.timezone ?? DEFAULT_TIMEZONE
}

export async function getTodayViewData(userId: string): Promise<{
  timezone: string
  data: TodayResponse
}> {
  const timezone = await getUserTimezone(userId)
  const today = todayInTimezone(timezone)

  const todayTickets = await db
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.userId, userId),
        eq(tickets.dueDate, today),
        ne(tickets.status, 'DONE'),
        notArchived
      )
    )
    .orderBy(tickets.priority, tickets.createdAt)

  return {
    timezone,
    data: {
      tickets: splitTicketsByContext(todayTickets),
      calendar_events: [],
      date: today,
    },
  }
}

export async function getFutureTicketsPage(
  userId: string,
  cursor?: string | null
): Promise<FutureResponse> {
  const timezone = await getUserTimezone(userId)
  const today = todayInTimezone(timezone)
  const decodedCursor = cursor ? decodeFutureCursor(cursor) : null

  const results = await db
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.userId, userId),
        ne(tickets.status, 'DONE'),
        or(gt(tickets.dueDate, today), isNull(tickets.dueDate)),
        notArchived,
        buildFutureCursorFilter(decodedCursor)
      )
    )
    .orderBy(asc(tickets.dueDate), desc(tickets.createdAt), desc(tickets.id))
    .limit(FUTURE_PAGE_SIZE)

  const lastTicket = results[results.length - 1]
  const nextCursor =
    results.length === FUTURE_PAGE_SIZE
      ? encodeFutureCursor(lastTicket)
      : null

  return { tickets: results, cursor: nextCursor }
}

export async function searchTickets(userId: string, query: string): Promise<Ticket[]> {
  const q = `%${query.trim()}%`
  return db
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.userId, userId),
        notArchived,
        or(ilike(tickets.title, q), ilike(tickets.overview, q), ilike(tickets.whatToDo, q))
      )
    )
    .orderBy(desc(tickets.updatedAt))
    .limit(SEARCH_LIMIT)
}

export async function getKanbanTickets(userId: string): Promise<TodayResponse['tickets']> {
  const allTickets = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.userId, userId), notArchived))
    .orderBy(tickets.createdAt)

  return splitTicketsByContext(allTickets)
}
