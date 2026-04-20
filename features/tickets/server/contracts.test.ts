import { describe, expect, it } from 'vitest'
import {
  createTicketSchema,
  updateTicketSchema,
  mapCreateTicketInputToDb,
  mapUpdateTicketInputToDb,
} from './contracts'

describe('createTicketSchema', () => {
  it('acepta input mínimo válido', () => {
    const result = createTicketSchema.safeParse({ title: 'Tarea', context: 'NEGOCIO' })
    expect(result.success).toBe(true)
  })

  it('rechaza título vacío', () => {
    const result = createTicketSchema.safeParse({ title: '', context: 'NEGOCIO' })
    expect(result.success).toBe(false)
  })

  it('rechaza título mayor a 200 caracteres', () => {
    const result = createTicketSchema.safeParse({ title: 'a'.repeat(201), context: 'NEGOCIO' })
    expect(result.success).toBe(false)
  })

  it('rechaza contexto inválido', () => {
    const result = createTicketSchema.safeParse({ title: 'Tarea', context: 'TRABAJO' })
    expect(result.success).toBe(false)
  })

  it('acepta due_date en formato YYYY-MM-DD', () => {
    const result = createTicketSchema.safeParse({
      title: 'Tarea', context: 'PERSONAL', due_date: '2026-12-31',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza due_date con formato inválido', () => {
    const result = createTicketSchema.safeParse({
      title: 'Tarea', context: 'PERSONAL', due_date: '31/12/2026',
    })
    expect(result.success).toBe(false)
  })

  it('acepta due_date null', () => {
    const result = createTicketSchema.safeParse({
      title: 'Tarea', context: 'NEGOCIO', due_date: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('updateTicketSchema', () => {
  it('acepta objeto vacío (update parcial)', () => {
    expect(updateTicketSchema.safeParse({}).success).toBe(true)
  })

  it('acepta status válido', () => {
    expect(updateTicketSchema.safeParse({ status: 'DONE' }).success).toBe(true)
    expect(updateTicketSchema.safeParse({ status: 'IN_PROGRESS' }).success).toBe(true)
  })

  it('rechaza status inválido', () => {
    expect(updateTicketSchema.safeParse({ status: 'FINISHED' }).success).toBe(false)
  })

  it('acepta priority válida', () => {
    expect(updateTicketSchema.safeParse({ priority: 'ALTA' }).success).toBe(true)
  })

  it('rechaza overview mayor a 2000 caracteres', () => {
    expect(updateTicketSchema.safeParse({ overview: 'x'.repeat(2001) }).success).toBe(false)
  })
})

describe('mapCreateTicketInputToDb', () => {
  it('trim al título', () => {
    const result = mapCreateTicketInputToDb({ title: '  Tarea  ', context: 'NEGOCIO' })
    expect(result.title).toBe('Tarea')
  })

  it('usa title como whatToDo cuando what_to_do no se provee', () => {
    const result = mapCreateTicketInputToDb({ title: 'Revisar', context: 'NEGOCIO' })
    expect(result.whatToDo).toBe('Revisar')
  })

  it('usa what_to_do cuando se provee', () => {
    const result = mapCreateTicketInputToDb({
      title: 'Revisar', context: 'NEGOCIO', what_to_do: 'Abrir el doc',
    })
    expect(result.whatToDo).toBe('Abrir el doc')
  })

  it('prioridad por defecto es MEDIA', () => {
    const result = mapCreateTicketInputToDb({ title: 'Tarea', context: 'NEGOCIO' })
    expect(result.priority).toBe('MEDIA')
  })

  it('status inicial siempre es PENDING', () => {
    const result = mapCreateTicketInputToDb({ title: 'Tarea', context: 'NEGOCIO' })
    expect(result.status).toBe('PENDING')
  })

  it('dueDate null cuando no se provee', () => {
    const result = mapCreateTicketInputToDb({ title: 'Tarea', context: 'NEGOCIO' })
    expect(result.dueDate).toBeNull()
  })
})

describe('mapUpdateTicketInputToDb', () => {
  it('mapea todos los campos opcionales', () => {
    const result = mapUpdateTicketInputToDb({
      status: 'DONE',
      title: 'Nueva tarea',
      due_date: '2026-05-01',
      priority: 'ALTA',
      overview: 'Resumen',
      what_to_do: 'Hacer algo',
    })

    expect(result.status).toBe('DONE')
    expect(result.title).toBe('Nueva tarea')
    expect(result.dueDate).toBe('2026-05-01')
    expect(result.priority).toBe('ALTA')
    expect(result.overview).toBe('Resumen')
    expect(result.whatToDo).toBe('Hacer algo')
  })

  it('siempre incluye updatedAt', () => {
    const result = mapUpdateTicketInputToDb({})
    expect(result.updatedAt).toBeInstanceOf(Date)
  })

  it('campos no provistos quedan undefined (Drizzle los omite)', () => {
    const result = mapUpdateTicketInputToDb({ status: 'DONE' })
    expect(result.title).toBeUndefined()
    expect(result.priority).toBeUndefined()
  })
})
