import type { H3Event } from 'h3'
import type { HydratedDocument } from 'mongoose'
import { User, type UserDocument } from '../models/User'

const UNAUTHORIZED_MESSAGE = 'Sign in to continue.'

// Real HTTP-only cookie session, replacing the Task 016 placeholder (which
// always resolved to the seeded demo user). Every schedule route already
// calls `requireAuth(event)` — only this function's internals changed, exactly
// as planned when the seam was introduced.
export async function requireAuth(event: H3Event): Promise<HydratedDocument<UserDocument>> {
  const token = getCookie(event, SESSION_COOKIE_NAME)
  const userId = token ? verifySessionToken(token) : null
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: UNAUTHORIZED_MESSAGE })
  }

  await connectDB()
  const user = await User.findById(userId)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: UNAUTHORIZED_MESSAGE })
  }
  return user
}

// The shape returned to the client — never the passwordHash (schema already
// marks it `select: false`, but this is the explicit "never send this to a
// browser" boundary for every auth response).
export function toPublicUser(user: HydratedDocument<UserDocument>) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    slug: user.slug,
    bio: user.bio,
    timezone: user.timezone
  }
}

export const OBJECT_ID_RE = /^[0-9a-f]{24}$/i
