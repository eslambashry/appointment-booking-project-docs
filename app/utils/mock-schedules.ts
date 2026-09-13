// Shared schedule types and small display helpers used across the admin
// schedule wizard and the public booking page. No longer holds mock data
// (Task 020 replaced it with real API calls below) — kept in this file/name
// rather than renamed, since only its contents changed, not what it's for.

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface TimeRange {
  start: string // 24h "HH:mm"
  end: string
}

export interface DayAvailability {
  day: Weekday
  enabled: boolean
  ranges: TimeRange[]
}

export interface BookingQuestion {
  id: string
  label: string
  type: 'short' | 'long'
  required: boolean
}

export type LocationType = 'in_person' | 'phone' | 'video' | 'custom'

export interface Schedule {
  id: string
  name: string
  description: string
  locationType: LocationType
  locationValue: string
  durationMinutes: 15 | 30 | 45 | 60
  timezone: string
  availability: DayAvailability[]
  bookingWindowDays: number
  minimumNoticeHours: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  collectPhone: boolean
  questions: BookingQuestion[]
  status: 'active' | 'disabled'
  slug: string
}

export const WEEKDAYS: { value: Weekday, label: string }[] = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' }
]

export function defaultAvailability(): DayAvailability[] {
  return WEEKDAYS.map(({ value }) => ({
    day: value,
    enabled: !['sat', 'sun'].includes(value),
    ranges: [{ start: '09:00', end: '17:00' }]
  }))
}

export function formatTime(time: string): string {
  const [hoursPart, minutesPart] = time.split(':')
  const hours = Number(hoursPart ?? 0)
  const minutes = Number(minutesPart ?? 0)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function availabilitySummary(availability: DayAvailability[]): string {
  const enabledDays = availability.filter((d) => d.enabled)
  if (enabledDays.length === 0) return 'No availability set'

  const firstRange = enabledDays[0]?.ranges[0]
  const allSameHours = !!firstRange && enabledDays.every(
    (d) => d.ranges.length === 1
      && d.ranges[0]?.start === firstRange.start
      && d.ranges[0]?.end === firstRange.end
  )

  const dayLabels = enabledDays.map((d) => WEEKDAYS.find((w) => w.value === d.day)!.label.slice(0, 3))
  const dayList = dayLabels.length > 3
    ? `${dayLabels[0]}–${dayLabels[dayLabels.length - 1]}`
    : dayLabels.join(', ')

  if (allSameHours && firstRange) {
    return `${dayList}, ${formatTime(firstRange.start)}–${formatTime(firstRange.end)}`
  }
  return `${dayList} · varies by day`
}

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  in_person: 'In person',
  phone: 'Phone call',
  video: 'Video call',
  custom: 'Custom'
}

// --- Real API integration (Task 020) ---

interface ApiScheduleQuestion {
  _id: string
  label: string
  type: 'short' | 'long'
  required: boolean
}

interface ApiSchedule {
  _id: string
  name: string
  description: string
  locationType: LocationType
  locationValue: string
  durationMinutes: number
  timezone: string
  availability: DayAvailability[]
  bookingWindowDays: number
  minimumNoticeHours: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  collectPhone: boolean
  questions: ApiScheduleQuestion[]
  status: 'active' | 'disabled'
  slug: string
}

// Maps Mongo's `_id`/subdocument `_id` to the client's `id` field — the only
// real shape difference between what the API returns and what these
// already-built components expect.
function toClientSchedule(raw: ApiSchedule): Schedule {
  return {
    id: raw._id,
    name: raw.name,
    description: raw.description,
    locationType: raw.locationType,
    locationValue: raw.locationValue,
    // durationMinutes is always one of 15/30/45/60 — both the UI (a 4-option
    // radio group) and the server's zod schema restrict it to exactly these.
    durationMinutes: raw.durationMinutes as Schedule['durationMinutes'],
    timezone: raw.timezone,
    availability: raw.availability,
    bookingWindowDays: raw.bookingWindowDays,
    minimumNoticeHours: raw.minimumNoticeHours,
    bufferBeforeMinutes: raw.bufferBeforeMinutes,
    bufferAfterMinutes: raw.bufferAfterMinutes,
    collectPhone: raw.collectPhone,
    questions: raw.questions.map((q) => ({ id: q._id, label: q.label, type: q.type, required: q.required })),
    status: raw.status,
    slug: raw.slug
  }
}

export async function fetchSchedules(): Promise<Schedule[]> {
  const raw = await $fetch<ApiSchedule[]>('/api/schedules')
  return raw.map(toClientSchedule)
}

export async function fetchSchedule(id: string): Promise<Schedule | null> {
  try {
    const raw = await $fetch<ApiSchedule>(`/api/schedules/${id}`)
    return toClientSchedule(raw)
  } catch (error) {
    if (apiErrorStatus(error) === 404) return null
    throw error
  }
}

export interface ScheduleInput {
  name: string
  description: string
  locationType: LocationType
  locationValue: string
  durationMinutes: number
  timezone: string
  availability: DayAvailability[]
  bookingWindowDays: number
  minimumNoticeHours: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  collectPhone: boolean
  questions: { label: string, type: 'short' | 'long', required: boolean }[]
  status: 'active' | 'disabled'
  slug?: string
}

export async function createSchedule(input: ScheduleInput): Promise<Schedule> {
  const raw = await $fetch<ApiSchedule>('/api/schedules', { method: 'POST', body: input })
  return toClientSchedule(raw)
}

export async function updateSchedule(id: string, input: Partial<ScheduleInput>): Promise<Schedule> {
  const raw = await $fetch<ApiSchedule>(`/api/schedules/${id}`, { method: 'PATCH', body: input })
  return toClientSchedule(raw)
}
