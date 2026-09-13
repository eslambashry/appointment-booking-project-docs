// Excludes visually ambiguous characters (0/O, 1/I) — this code is read aloud
// and typed back by customers, so avoiding them prevents mistyped confirmations.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateConfirmationCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return `BOOK-${code}`
}

interface MongoDuplicateKeyError {
  code: number
  keyPattern?: Record<string, unknown>
}

function isMongoDuplicateKeyError(error: unknown): error is MongoDuplicateKeyError {
  return typeof error === 'object' && error !== null && 'code' in error
    && (error as { code: unknown }).code === 11000
}

// Distinguishes *which* unique constraint was violated: the double-booking
// guard ({scheduleId, startAt}, server/models/Appointment.ts) means someone
// else just took this exact slot — a real 409. A confirmationCode collision
// is an unrelated, extremely rare coincidence that should just be retried
// with a freshly generated code, not surfaced to the customer as a conflict.
export function duplicateKeyField(error: unknown): 'slot' | 'confirmationCode' | null {
  if (!isMongoDuplicateKeyError(error)) return null
  const keys = Object.keys(error.keyPattern ?? {})
  if (keys.includes('startAt')) return 'slot'
  if (keys.includes('confirmationCode')) return 'confirmationCode'
  return null
}
