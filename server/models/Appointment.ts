// See User.ts for why this is a default import + destructure, not named imports.
import mongoose, { type InferSchemaType, type Model } from 'mongoose'
const { Schema, model, models } = mongoose

const answerSchema = new Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true }
}, { _id: false })

const appointmentSchema = new Schema({
  scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule', required: true, index: true },
  // Denormalized from the schedule at creation time so "my appointments across
  // all schedules" (the admin dashboard/calendar/appointments list) doesn't need
  // an extra lookup per row — matches docs/ARCHITECTURE.md's Appointment entity.
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  customerName: { type: String, required: true, trim: true },
  customerEmail: { type: String, required: true, lowercase: true, trim: true },
  customerPhone: { type: String },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  timezone: { type: String, required: true },
  status: { type: String, required: true, enum: ['confirmed', 'completed', 'cancelled'], default: 'confirmed' },
  answers: { type: [answerSchema], default: [] },
  confirmationCode: { type: String, required: true, unique: true },
  // Set once the day-of reminder email has gone out (server/utils/reminders.ts)
  // so a cron run that fires twice for the same day — Vercel's own docs warn
  // invocations aren't exactly-once — never double-sends.
  reminderSentAt: { type: Date }
}, { timestamps: true })

// Query pattern from docs/ARCHITECTURE.md §5: "appointments by owner/date"
// (calendar, dashboard, appointments list).
appointmentSchema.index({ ownerId: 1, startAt: 1 })

// The actual double-booking guard (docs/ARCHITECTURE.md §7, CLAUDE.md §9): even if
// two requests both pass an application-level "is this slot free?" check at the
// same moment, only one insert can win here — MongoDB enforces uniqueness on the
// index atomically, so the loser gets a duplicate-key error (E11000) instead of a
// second appointment silently existing. The application-level check (Task 019)
// exists to fail fast with a clear error; this index is what makes it actually safe.
// This single index also covers "appointments by schedule/date" reads (scheduleId
// is its first key), so there's no separate plain {scheduleId, startAt} index —
// declaring both on the exact same key pattern is a duplicate-index conflict;
// Mongoose keeps only the first and silently drops the unique/partial options off
// the second, which would have quietly disabled this guard entirely.
// Partial filter uses $in rather than $ne — MongoDB partial indexes only support
// $eq/$in/$exists/$gt(e)/$lt(e)/$type, not $ne (it's implemented as $not, which
// partial filter expressions reject outright at index-creation time).
appointmentSchema.index(
  { scheduleId: 1, startAt: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['confirmed', 'completed'] } } }
)

export type AppointmentDocument = InferSchemaType<typeof appointmentSchema>

// Explicit <AppointmentDocument> generic — see User.ts for why this matters.
export const Appointment = (models.Appointment as Model<AppointmentDocument>) || model<AppointmentDocument>('Appointment', appointmentSchema)
