export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', href: '/favicon.ico' }
      ]
    }
  },

  // Server-only secrets. Populated from .env via NUXT_<KEY> — e.g. NUXT_MONGODB_URI
  // maps to runtimeConfig.mongodbUri. Never exposed to the client (nothing here is
  // under a `public` key).
  runtimeConfig: {
    mongodbUri: '',
    sessionSecret: '',
    // Optional — Redis is a performance/rate-limit aid, never the source of
    // truth (CLAUDE.md §10). Left unset, every Redis-backed feature falls
    // back to computing fresh, not to an error.
    redisUrl: '',
    // Optional — day-of reminder emails (server/utils/email.ts). Left unset,
    // sendEmail() logs instead of sending, same "degrade, don't 500" pattern
    // as Redis above.
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    // Public base URL — used server-side to build links inside reminder
    // emails, and exposed to the client below to build booking-page links.
    // Not a secret, so it's safe under `public`. Falls back to localhost in dev.
    public: {
      appUrl: process.env.NUXT_APP_URL || 'http://localhost:3000'
    }
  },

  devtools: { enabled: true },

  future: { compatibilityVersion: 4 },

  compatibilityDate: '2025-01-01',

  typescript: {
    strict: true,
    typeCheck: false
  }
})
