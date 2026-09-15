// Convenience wrapper around the existing GET /api/cron/send-reminders route
// — not a new endpoint, just a local shortcut so triggering a real send
// during development doesn't mean re-typing the bearer token every time.
// Run with: npm run send-reminders (dev server must already be running).
const baseUrl = process.env.LOCAL_APP_URL || 'http://localhost:3000'
const secret = process.env.CRON_SECRET

if (!secret) {
  console.error('CRON_SECRET is not set — check your .env file.')
  process.exit(1)
}

const response = await fetch(`${baseUrl}/api/cron/send-reminders`, {
  headers: { Authorization: `Bearer ${secret}` }
})

const body = await response.json()
console.log(response.status, body)

if (!response.ok) process.exit(1)
