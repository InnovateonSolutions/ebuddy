import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  date,
  time,
  integer,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core'
import type { AdapterAccountType } from 'next-auth/adapters'

// ─── Enums ───────────────────────────────────────────────────

export const ticketContextEnum = pgEnum('ticket_context', ['NEGOCIO', 'PERSONAL'])
export const ticketPriorityEnum = pgEnum('ticket_priority', ['ALTA', 'MEDIA', 'BAJA'])
export const ticketStatusEnum = pgEnum('ticket_status', ['PENDING', 'IN_PROGRESS', 'QA', 'DONE'])
export const calendarProviderEnum = pgEnum('calendar_provider', ['GOOGLE', 'MICROSOFT'])

// ─── Auth.js required tables ─────────────────────────────────

export const users = pgTable('users', {
  // Auth.js fields
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  // App custom fields
  displayName: text('display_name').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const accounts = pgTable(
  'accounts',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
)

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
)

// ─── App tables ───────────────────────────────────────────────

export const userPreferences = pgTable('user_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  timezone: text('timezone').notNull().default('America/Tijuana'),
  workStart: time('work_start').notNull().default('08:00'),
  workEnd: time('work_end').notNull().default('19:00'),
  apiKey: text('api_key'),
})

export const tickets = pgTable(
  'tickets',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    context: ticketContextEnum('context').notNull(),
    overview: text('overview').notNull().default(''),
    whatToDo: text('what_to_do').notNull().default(''),
    nextSteps: text('next_steps').array().notNull().default([]),
    priority: ticketPriorityEnum('priority').notNull().default('MEDIA'),
    status: ticketStatusEnum('status').notNull().default('PENDING'),
    dueDate: date('due_date'),
    rawInput: text('raw_input').notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    userDateIdx: index('idx_tickets_user_date').on(t.userId, t.dueDate),
    userStatusIdx: index('idx_tickets_user_status').on(t.userId, t.status),
    userContextIdx: index('idx_tickets_user_context').on(t.userId, t.context),
  })
)

export const calendarTokens = pgTable(
  'calendar_tokens',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: calendarProviderEnum('provider').notNull(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.provider] }),
  })
)

// ─── Visit counter (singleton row id=1) ──────────────────────

export const visitCounter = pgTable('visit_counter', {
  id: integer('id').primaryKey().default(1),
  count: integer('count').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── Inferred types ───────────────────────────────────────────

export type User = typeof users.$inferSelect
export type Ticket = typeof tickets.$inferSelect
export type NewTicket = typeof tickets.$inferInsert
export type UserPreferences = typeof userPreferences.$inferSelect
export type CalendarToken = typeof calendarTokens.$inferSelect
