// Default import + destructure, not `import { Schema, model, models } from 'mongoose'`
// — mongoose ships as CommonJS, and Nuxt dev's native ESM loader can't resolve
// its named exports directly (works in the bundled production build, where
// Rollup rewrites the interop, but not in dev SSR). Types are unaffected since
// type-only imports are erased before this matters.
import mongoose, { type InferSchemaType, type Model } from 'mongoose'
const { Schema, model, models } = mongoose

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // select: false — never returned by a normal query (e.g. `User.find()` for an
  // appointment's owner details); must be explicitly requested with `.select('+passwordHash')`.
  passwordHash: { type: String, required: true, select: false },
  timezone: { type: String, required: true, default: 'UTC' },
  // Public booking-page identity, e.g. /book/<slug>/<schedule-slug>.
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  bio: { type: String, default: '' }
}, { timestamps: true })

export type UserDocument = InferSchemaType<typeof userSchema>

// `models.User ||` avoids "Cannot overwrite `User` model once compiled" — Nitro's
// dev-mode hot reload can re-execute this module without a fresh Node process,
// and Mongoose's model registry is global, not per-module.
// Explicit <UserDocument> generic: without it, `model()`'s own inferred type
// disagrees with `InferSchemaType` on embedded-array shapes (Hydrated
// DocumentArray vs. plain array), which breaks typing for anything that reads
// or writes a document (queries, create, insertMany).
export const User = (models.User as Model<UserDocument>) || model<UserDocument>('User', userSchema)
