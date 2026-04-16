import { and, asc, desc, eq, gt, isNull, lt, ne, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tickets, userPreferences } from '@/lib/db/schema'
import type { FutureResponse, Ticket, TodayResponse } from '@/lib/types'
import { todayInTimezone } from '@/lib/utils'

const DEFAULT_TIMEZONE = 'America/Tijuana'
const FUTURE_PAGE_SIZE = 20

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
        ne(tickets.status, 'DONE')
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

  const results = await db
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.userId, userId),
        ne(tickets.status, 'DONE'),
        or(gt(tickets.dueDate, today), isNull(tickets.dueDate)),
        cursor ? lt(tickets.createdAt, new Date(cursor)) : undefined
      )
    )
    .orderBy(asc(tickets.dueDate), desc(tickets.createdAt))
    .limit(FUTURE_PAGE_SIZE)

  const lastTicket = results[results.length - 1]
  const nextCursor =
    results.length === FUTURE_PAGE_SIZE
      ? lastTicket?.createdAt?.toISOString() ?? null
      : null

  return { tickets: results, cursor: nextCursor }
}

export async function getKanbanTickets(userId: string): Promise<TodayResponse['tickets']> {
  const allTickets = await db
    .select()
    .from(tickets)
    .where(eq(tickets.userId, userId))
    .orderBy(tickets.createdAt)

  return splitTicketsByContext(allTickets)
}
