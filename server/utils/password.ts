import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64

// Node's built-in `crypto.scrypt` — no extra dependency for a task whose actual
// scope is seed data, not authentication (that's Task 017). Format is
// "<salt-hex>:<hash-hex>" so verification is self-contained (no separate salt
// column/lookup). Task 017 should reuse this rather than introducing a second
// hashing scheme (e.g. bcrypt) unless there's a specific reason to switch —
// switching later means re-seeding the demo account.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, KEY_LENGTH) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(':')
  if (!salt || !key) return false
  const keyBuffer = Buffer.from(key, 'hex')
  const derivedKey = await scrypt(password, salt, keyBuffer.length) as Buffer
  return keyBuffer.length === derivedKey.length && timingSafeEqual(keyBuffer, derivedKey)
}
