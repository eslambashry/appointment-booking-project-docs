import mongoose from 'mongoose'

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Cached on `globalThis` so it survives Nitro's dev-mode hot reloads and, more
// importantly, would survive serverless-style cold starts if ever deployed that
// way — without this, a fresh mongoose.connect() per request would exhaust
// MongoDB's connection limit almost immediately.
const globalForMongoose = globalThis as unknown as { __mongooseCache?: MongooseCache }

const cache: MongooseCache = globalForMongoose.__mongooseCache ?? { conn: null, promise: null }
globalForMongoose.__mongooseCache = cache

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn

  if (!cache.promise) {
    const { mongodbUri } = useRuntimeConfig()
    if (!mongodbUri) {
      throw new Error('MongoDB connection string is missing. Set NUXT_MONGODB_URI in your .env file.')
    }
    // Don't cache a *failed* connection attempt — without clearing it back to
    // null on rejection, a single transient network blip would wedge every
    // future request behind the same rejected promise permanently (Mongoose
    // never retries a promise that's already settled), even once MongoDB is
    // reachable again, until the whole process restarts. Found during the
    // Task 023 hardening pass.
    cache.promise = mongoose.connect(mongodbUri).catch((error: unknown) => {
      cache.promise = null
      throw error
    })
  }

  cache.conn = await cache.promise
  return cache.conn
}
