import { User } from '../../models/User'

// POST /api/auth/register — creates an admin account and signs the caller in
// immediately (matches the frontend's existing register → dashboard flow from
// Task 005, rather than a separate "now log in" step).
export default defineEventHandler(async (event) => {
  await enforceRateLimit(event, 'register')

  const body = await readBody(event)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: parsed.error.issues[0]?.message ?? 'Invalid registration data',
      data: { issues: parsed.error.issues }
    })
  }

  await connectDB()

  const existing = await User.findOne({ email: parsed.data.email })
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'An account with this email already exists.'
    })
  }

  // User.slug is globally unique (public booking identity, /book/<slug>/<...>),
  // unlike Schedule.slug which is only unique per owner — so a name collision
  // here is resolved with a numeric suffix rather than rejecting the signup;
  // the admin never even chose this value, it would be a confusing error to
  // block them over it.
  const base = slugify(parsed.data.name)
  let slug = base
  let suffix = 2
  while (await User.findOne({ slug })) {
    slug = `${base}-${suffix}`
    suffix += 1
  }

  const passwordHash = await hashPassword(parsed.data.password)
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    timezone: 'UTC',
    slug,
    bio: ''
  })

  setSessionCookie(event, user._id.toString())
  setResponseStatus(event, 201)
  return { user: toPublicUser(user) }
})
