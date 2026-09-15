import type { HydratedDocument } from 'mongoose'
import { Appointment, type AppointmentDocument } from '../models/Appointment'
import { Schedule, type ScheduleDocument } from '../models/Schedule'
import { User } from '../models/User'
import { closeEmailTransporter, sendEmail } from './email'
import { buildAdminDigestEmail, buildCustomerReminderEmail } from './reminder-emails'

// A plain UTC calendar-day window (matching scheduling-engine.ts's own
// documented simplification) doesn't work here: unlike slot generation,
// which only reasons about future availability math, this decides "is it
// today *for this recipient*" — and a server whose clock isn't UTC (or a
// customer/owner in a timezone far from the server's) can disagree with UTC
// about which calendar day it currently is. Confirmed for real during
// testing: a UTC+3 dev machine at 01:44 local (still Sep 14 in UTC, already
// Sep 15 local) found 0 of 2 seeded "today" appointments under a pure-UTC
// window. So each appointment is judged against its own stored IANA
// `timezone` (server/models/Appointment.ts) via Intl, not a single global
// window. The DB query below is just a cheap superset — wide enough to
// contain "today" in any IANA zone (max UTC-12..UTC+14) around `now` — and
// the precise per-appointment check happens in isToday() afterward.
const QUERY_WINDOW_MS = 36 * 60 * 60_000

function isToday(date: Date, now: Date, timezone: string): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
  return fmt.format(date) === fmt.format(now)
}

export interface ReminderRunResult {
  appointmentsFound: number
  customerEmailsSent: number
  adminEmailsSent: number
}

// The whole "who has a meeting today, tell them" service (server/api/cron/send-reminders.get.ts
// is the trigger). Reads confirmed, not-yet-reminded appointments for today,
// emails each customer their own reminder, and emails each owner one digest
// covering all of their appointments today — then marks every appointment
// processed so a second cron run the same day (Vercel doesn't guarantee
// exactly-once delivery) never double-sends.
export async function sendTodaysReminders(now: Date = new Date()): Promise<ReminderRunResult> {
  const candidates = await Appointment.find({
    status: 'confirmed',
    startAt: { $gte: new Date(now.getTime() - QUERY_WINDOW_MS), $lte: new Date(now.getTime() + QUERY_WINDOW_MS) },
    reminderSentAt: { $exists: false }
  }) as HydratedDocument<AppointmentDocument>[]

  const appointments = candidates.filter((a) => isToday(a.startAt, now, a.timezone))

  if (appointments.length === 0) {
    return { appointmentsFound: 0, customerEmailsSent: 0, adminEmailsSent: 0 }
  }

  const scheduleIds = [...new Set(appointments.map((a) => a.scheduleId.toString()))]
  const schedules = await Schedule.find({ _id: { $in: scheduleIds } }) as HydratedDocument<ScheduleDocument>[]
  const scheduleById = new Map(schedules.map((s) => [s._id.toString(), s]))

  const ownerIds = [...new Set(appointments.map((a) => a.ownerId.toString()))]
  const owners = await User.find({ _id: { $in: ownerIds } }).select('name email')
  const ownerById = new Map(owners.map((o) => [o._id.toString(), o]))

  type Item = { appointment: HydratedDocument<AppointmentDocument>; schedule: HydratedDocument<ScheduleDocument> }
  const items: Item[] = []
  const byOwner = new Map<string, Item[]>()

  for (const appointment of appointments) {
    const schedule = scheduleById.get(appointment.scheduleId.toString())
    const owner = ownerById.get(appointment.ownerId.toString())
    if (!schedule || !owner) continue // orphaned data — skip rather than crash the whole run

    const item = { appointment, schedule }
    items.push(item)

    const ownerKey = owner._id.toString()
    if (!byOwner.has(ownerKey)) byOwner.set(ownerKey, [])
    byOwner.get(ownerKey)!.push(item)
  }

  // Sent concurrently, not one at a time — server/utils/email.ts pools SMTP
  // connections across this batch, which together with concurrency is what
  // keeps a day with several appointments inside a serverless platform's
  // short per-invocation time budget (e.g. Vercel Hobby's default 10s).
  const [customerResults, adminResults] = await Promise.all([
    Promise.all(items.map((item) => sendEmail({
      to: item.appointment.customerEmail,
      ...buildCustomerReminderEmail(item, ownerById.get(item.appointment.ownerId.toString())!.name)
    }))),
    Promise.all([...byOwner.entries()].map(([ownerKey, ownerItems]) => {
      const owner = ownerById.get(ownerKey)!
      return sendEmail({ to: owner.email, ...buildAdminDigestEmail(owner.name, ownerItems) })
    }))
  ])

  closeEmailTransporter()

  const customerEmailsSent = customerResults.filter(Boolean).length
  const adminEmailsSent = adminResults.filter(Boolean).length

  // Marked once per run regardless of per-message delivery success — a
  // transient SMTP failure should not be retried every subsequent run for
  // the rest of the day and turn into a flood once the mail server recovers.
  await Appointment.updateMany(
    { _id: { $in: items.map((item) => item.appointment._id.toString()) } },
    { $set: { reminderSentAt: new Date() } }
  )

  return { appointmentsFound: appointments.length, customerEmailsSent, adminEmailsSent }
}
