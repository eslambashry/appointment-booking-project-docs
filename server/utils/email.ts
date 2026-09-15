import nodemailer, { type Transporter } from 'nodemailer'

// Same "degrade, don't crash the request" shape as server/utils/redis.ts:
// SMTP is a real external dependency, so a missing/misconfigured mail server
// must never turn into a 500 for whatever triggered the email (here, the
// reminder cron — CLAUDE.md never actually requires email to be reliable,
// only that booking/availability/auth stay correct). Lazily built and cached
// on first use, reset back to undefined on a connection error so the next
// call gets a fresh transporter instead of being wedged behind a dead one.
let transporter: Transporter | null | undefined

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter

  const { smtpHost, smtpPort, smtpUser, smtpPass } = useRuntimeConfig()
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    transporter = null
    return transporter
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    // 465 is SMTP-over-TLS from the start; every other common port (587, 25)
    // starts plaintext and upgrades via STARTTLS, which nodemailer handles
    // automatically when `secure` is false.
    secure: Number(smtpPort) === 465,
    auth: { user: smtpUser, pass: smtpPass },
    // Reminders send a batch of emails in one run (server/utils/reminders.ts)
    // — pooling reuses SMTP connections across that batch instead of a fresh
    // connect/quit per message, which matters on a serverless platform with a
    // short per-invocation time budget (e.g. Vercel's default 10s on Hobby).
    pool: true,
    maxConnections: 3,
    maxMessages: 50
  })

  return transporter
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text: string
}

// Returns whether the email actually went out — callers use this to decide
// what to report/log, never to change booking/appointment state, since email
// delivery is not the source of truth for anything (CLAUDE.md §10's Redis
// rule applied to the same principle here).
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const client = getTransporter()
  if (!client) {
    console.warn(`[email] SMTP not configured — skipping email to ${input.to}: "${input.subject}"`)
    return false
  }

  try {
    const { smtpFrom, smtpUser } = useRuntimeConfig()
    await client.sendMail({
      from: smtpFrom || smtpUser,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    })
    return true
  } catch (error) {
    console.error(`[email] send failed for ${input.to}:`, (error as Error).message)
    transporter = undefined
    return false
  }
}

// A pooled transporter (above) keeps its SMTP connections open until closed
// — call this once a batch of sends is done (server/utils/reminders.ts) so a
// serverless invocation isn't left holding open sockets, and reset the cache
// so the next run builds a fresh pool rather than reusing a closed one.
export function closeEmailTransporter(): void {
  transporter?.close()
  transporter = undefined
}
