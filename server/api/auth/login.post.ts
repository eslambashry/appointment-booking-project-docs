import { User } from '../../models/User'

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.'

// POST /api/auth/login — deliberately the same error message and status
// whether the email doesn't exist or the password is wrong, so a caller can't
// use this endpoint to discover which registered emails exist.
export default defineEventHandler(async (event) => {
  await enforceRateLimit(event, 'login')

  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: parsed.error.issues[0]?.message ?? 'Invalid login data',
      data: { issues: parsed.error.issues }
    })
  }

  await connectDB()

  const user = await User.findOne({ email: parsed.data.email }).select('+passwordHash')
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: INVALID_CREDENTIALS_MESSAGE })
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: INVALID_CREDENTIALS_MESSAGE })
  }

  setSessionCookie(event, user._id.toString())
  return { user: toPublicUser(user) }
})
