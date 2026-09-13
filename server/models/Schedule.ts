// See User.ts for why this is a default import + destructure, not named imports.
import mongoose, { type InferSchemaType, type Model } from 'mongoose'
const { Schema, model, models } = mongoose

const timeRangeSchema = new Schema({
  start: { type: String, required: true }, // 24h "HH:mm"
  end: { type: String, required: true }
}, { _id: false })

const dayAvailabilitySchema = new Schema({
  day: { type: String, required: true, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  enabled: { type: Boolean, required: true, default: false },
  ranges: { type: [timeRangeSchema], default: [] }
}, { _id: false })

// Each question keeps its default auto-generated _id — the frontend wizard
// (Task 007) already treats a question's id as a stable identifier for editing.
const bookingQuestionSchema = new Schema({
  label: { type: String, required: true, trim: true },
  type: { type: String, required: true, enum: ['short', 'long'] },
  required: { type: Boolean, required: true, default: false }
})

const scheduleSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  locationType: { type: String, required: true, enum: ['in_person', 'phone', 'video', 'custom'] },
  locationValue: { type: String, required: true },
  durationMinutes: { type: Number, required: true, min: 1 },
  timezone: { type: String, required: true },
  availability: { type: [dayAvailabilitySchema], default: [] },
  bookingWindowDays: { type: Number, required: true, min: 1 },
  minimumNoticeHours: { type: Number, required: true, min: 0 },
  bufferBeforeMinutes: { type: Number, default: 0, min: 0 },
  bufferAfterMinutes: { type: Number, default: 0, min: 0 },
  collectPhone: { type: Boolean, default: false },
  questions: { type: [bookingQuestionSchema], default: [] },
  status: { type: String, required: true, enum: ['active', 'disabled'], default: 'active' },
  slug: { type: String, required: true, lowercase: true, trim: true }
}, { timestamps: true })

// Slugs only need to be unique within one owner's public booking page
// (/book/<owner-slug>/<schedule-slug>), not globally.
scheduleSchema.index({ ownerId: 1, slug: 1 }, { unique: true })

export type ScheduleDocument = InferSchemaType<typeof scheduleSchema>

// Explicit <ScheduleDocument> generic — see User.ts for why this matters.
export const Schedule = (models.Schedule as Model<ScheduleDocument>) || model<ScheduleDocument>('Schedule', scheduleSchema)
