import { describe, it, expect } from 'vitest'
import { isOwner } from './owner'

describe('isOwner', () => {
  it('returns true for owner email', () => {
    expect(isOwner('martin.cuevas.t@gmail.com')).toBe(true)
  })

  it('returns false for other emails', () => {
    expect(isOwner('otro@gmail.com')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isOwner(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isOwner(undefined)).toBe(false)
  })
})
