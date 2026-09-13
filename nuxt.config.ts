export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  // Server-only secrets. Populated from .env via NUXT_<KEY> — e.g. NUXT_MONGODB_URI
  // maps to runtimeConfig.mongodbUri. Never exposed to the client (nothing here is
  // under a `public` key).
  runtimeConfig: {
    mongodbUri: '',
    sessionSecret: '',
    // Optional — Redis is a performance/rate-limit aid, never the source of
    // truth (CLAUDE.md §10). Left unset, every Redis-backed feature falls
    // back to computing fresh, not to an error.
    redisUrl: ''
  },

  devtools: { enabled: true },

  future: { compatibilityVersion: 4 },

  compatibilityDate: '2025-01-01',

  typescript: {
    strict: true,
    typeCheck: false
  }
})
