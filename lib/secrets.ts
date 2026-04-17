import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { env } from '@/lib/env'

const IV_LENGTH = 12

function getEncryptionKey() {
  return createHash('sha256').update(env.authSecret).digest()
}

export function hashApiKey(apiKey: string) {
  return createHash('sha256').update(apiKey).digest('hex')
}

export function buildApiKeyPreview(apiKey: string) {
  return `${apiKey.slice(0, 8)}${'•'.repeat(24)}${apiKey.slice(-8)}`
}

export function encryptSecret(value: string) {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptSecret(value: string) {
  const payload = Buffer.from(value, 'base64')
  const iv = payload.subarray(0, IV_LENGTH)
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + 16)
  const encrypted = payload.subarray(IV_LENGTH + 16)
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function decryptSecretOrPlaintext(value: string) {
  try {
    return decryptSecret(value)
  } catch {
    return value
  }
}
