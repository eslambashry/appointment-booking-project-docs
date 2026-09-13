import { User } from '../../models/User'
import { Schedule } from '../../models/Schedule'
import { Appointment } from '../../models/Appointment'

// Dev-only: seeds one demo owner, a few schedules, and a realistic spread of
// appointments so the admin UI (Task 020+) has real data to render instead of
// an empty database. Guarded so it can never run in production — an unguarded
// "wipe and reseed" endpoint would be a serious data-loss/security hole.
const DEMO_EMAIL = 'demo@schedulo.app'
const DEMO_PASSWORD = 'password123'

interface ScheduleSeed {
  name: string
  description: string
  locationType: 'in_person' | 'phone' | 'video' | 'custom'
  locationValue: string
  durationMinutes: number
  timezone: string
  availability: { day: string, enabled: boolean, ranges: { start: string, end: string }[] }[]
  bookingWindowDays: number
  minimumNoticeHours: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  collectPhone: boolean
  questions: { label: string, type: 'short' | 'long', required: boolean }[]
  status: 'active' | 'disabled'
  slug: string
}

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function weekdayHours(start: string, end: string, days: string[]): ScheduleSeed['availability'] {
  return WEEKDAYS.map((day) => ({
    day,
    enabled: days.includes(day),
    ranges: [{ start, end }]
  }))
}

// Mirrors app/utils/mock-schedules.ts so the seeded database and the frontend
// mock data describe the same demo business — makes Task 020's swap-in a
// like-for-like comparison instead of a surprise.
const SCHEDULE_SEEDS: ScheduleSeed[] = [
  {
    name: 'Consultation Call',
    description: 'A free 30 minute call to discuss your project and see if we\'re a good fit.',
    locationType: 'video',
    locationValue: 'Google Meet link sent after booking',
    durationMinutes: 30,
    timezone: 'America/New_York',
    availability: (() => {
      const availability = weekdayHours('09:00', '17:00', ['mon', 'tue', 'wed', 'thu', 'fri'])
      const monday = availability.find((d) => d.day === 'mon')
      if (monday) monday.ranges = [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }]
      return availability
    })(),
    bookingWindowDays: 30,
    minimumNoticeHours: 4,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 10,
    collectPhone: false,
    questions: [{ label: 'What would you like to discuss?', type: 'long', required: true }],
    status: 'active',
    slug: 'consultation-call'
  },
  {
    name: 'Product Demo',
    description: 'A 45 minute walkthrough of the product with time for questions.',
    locationType: 'video',
    locationValue: 'Zoom link sent after booking',
    durationMinutes: 45,
    timezone: 'America/New_York',
    availability: weekdayHours('10:00', '16:00', ['mon', 'tue', 'wed', 'thu']),
    bookingWindowDays: 14,
    minimumNoticeHours: 24,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 5,
    collectPhone: true,
    questions: [
      { label: 'Company name', type: 'short', required: true },
      { label: 'What are you hoping to solve?', type: 'long', required: false }
    ],
    status: 'active',
    slug: 'product-demo'
  },
  {
    name: 'Onboarding Session',
    description: 'First session for new customers to get set up.',
    locationType: 'in_person',
    locationValue: '123 Market Street, Suite 400',
    durationMinutes: 60,
    timezone: 'America/New_York',
    availability: weekdayHours('09:00', '17:00', ['mon', 'tue', 'wed', 'thu', 'fri']),
    bookingWindowDays: 45,
    minimumNoticeHours: 48,
    bufferBeforeMinutes: 15,
    bufferAfterMinutes: 15,
    collectPhone: true,
    questions: [],
    status: 'disabled',
    slug: 'onboarding-session'
  }
]

const CUSTOMERS = [
  { name: 'Maria Chen', email: 'maria.chen@example.com', phone: '+1 415 555 0132' },
  { name: 'James Okafor', email: 'james.okafor@example.com', phone: '+1 646 555 0187' },
  { name: 'Priya Natarajan', email: 'priya.n@example.com', phone: '+1 512 555 0114' },
  { name: 'Tom Becker', email: 'tom.becker@example.com', phone: '+1 303 555 0176' },
  { name: 'Sara Lindqvist', email: 'sara.l@example.com', phone: '+1 206 555 0159' },
  { name: 'Diego Alvarez', email: 'diego.alvarez@example.com', phone: '+1 305 555 0142' },
  { name: 'Emily Zhao', email: 'emily.zhao@example.com', phone: '+1 212 555 0198' }
]

interface AppointmentSeed {
  daysFromToday: number
  hour: number
  minute?: number
  scheduleIndex: number
  customerIndex: number
  status: 'confirmed' | 'completed' | 'cancelled'
}

// Same shape as app/utils/mock-appointments.ts's SEEDS: a spread across past
// (completed/cancelled), today, and upcoming days, computed relative to "now"
// at seed time rather than fixed calendar dates — so "Today" in the admin UI
// always has something real to show regardless of when this is run.
const APPOINTMENT_SEEDS: AppointmentSeed[] = [
  { daysFromToday: -6, hour: 10, scheduleIndex: 0, customerIndex: 0, status: 'completed' },
  { daysFromToday: -3, hour: 14, scheduleIndex: 1, customerIndex: 1, status: 'completed' },
  { daysFromToday: -1, hour: 11, scheduleIndex: 0, customerIndex: 2, status: 'cancelled' },
  { daysFromToday: 0, hour: 9, minute: 30, scheduleIndex: 0, customerIndex: 3, status: 'confirmed' },
  { daysFromToday: 0, hour: 14, scheduleIndex: 1, customerIndex: 4, status: 'confirmed' },
  { daysFromToday: 1, hour: 10, scheduleIndex: 2, customerIndex: 5, status: 'confirmed' },
  { daysFromToday: 2, hour: 9, scheduleIndex: 0, customerIndex: 6, status: 'confirmed' },
  { daysFromToday: 2, hour: 11, scheduleIndex: 1, customerIndex: 0, status: 'confirmed' },
  { daysFromToday: 3, hour: 15, scheduleIndex: 0, customerIndex: 1, status: 'confirmed' },
  { daysFromToday: 3, hour: 9, minute: 30, scheduleIndex: 2, customerIndex: 4, status: 'confirmed' },
  { daysFromToday: 5, hour: 10, scheduleIndex: 2, customerIndex: 2, status: 'confirmed' },
  { daysFromToday: 8, hour: 13, scheduleIndex: 1, customerIndex: 3, status: 'confirmed' }
]

function dateAt(daysFromToday: number, hour: number, minute = 0): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + daysFromToday)
  date.setHours(hour, minute, 0, 0)
  return date
}

export default defineEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Seeding is only available in development.'
    })
  }

  await connectDB()

  // Scoped cleanup (only this demo owner's data), not a full database wipe —
  // safe to re-run even if the same MongoDB database is later shared with
  // other data, and it's a small real demonstration of an ownership-scoped
  // query rather than a blunt "drop everything."
  const existingOwner = await User.findOne({ email: DEMO_EMAIL })
  if (existingOwner) {
    const ownedSchedules = await Schedule.find({ ownerId: existingOwner._id }).select('_id')
    const ownedScheduleIds = ownedSchedules.map((s) => s._id)
    await Appointment.deleteMany({ scheduleId: { $in: ownedScheduleIds } })
    await Schedule.deleteMany({ ownerId: existingOwner._id })
    await User.deleteOne({ _id: existingOwner._id })
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD)
  const owner = await User.create({
    name: 'Alex Rivera',
    email: DEMO_EMAIL,
    passwordHash,
    timezone: 'America/New_York',
    slug: 'alex-rivera',
    bio: 'Helping teams ship faster, one conversation at a time.'
  })

  const schedules = await Schedule.insertMany(
    SCHEDULE_SEEDS.map((seed) => ({ ...seed, ownerId: owner._id }))
  )

  const appointments = APPOINTMENT_SEEDS.map((seed, index) => {
    const schedule = schedules[seed.scheduleIndex % schedules.length]!
    const scheduleSeed = SCHEDULE_SEEDS[seed.scheduleIndex % SCHEDULE_SEEDS.length]!
    const customer = CUSTOMERS[seed.customerIndex % CUSTOMERS.length]!
    const startAt = dateAt(seed.daysFromToday, seed.hour, seed.minute)
    const endAt = new Date(startAt.getTime() + scheduleSeed.durationMinutes * 60_000)

    return {
      scheduleId: schedule._id,
      ownerId: owner._id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: scheduleSeed.collectPhone ? customer.phone : undefined,
      startAt,
      endAt,
      timezone: scheduleSeed.timezone,
      status: seed.status,
      answers: scheduleSeed.questions.map((q) => ({
        question: q.label,
        answer: 'Sample answer for preview purposes.'
      })),
      confirmationCode: `BOOK-${1000 + index}`
    }
  })

  await Appointment.insertMany(appointments)

  return {
    status: 'ok',
    seeded: {
      owner: { email: owner.email, slug: owner.slug },
      schedules: schedules.length,
      appointments: appointments.length
    },
    demoLogin: { email: DEMO_EMAIL, password: DEMO_PASSWORD }
  }
})
