import type { LocationType, Weekday } from './mock-schedules'

export interface PublicScheduleQuestion {
  id: string
  label: string
  type: 'short' | 'long'
  required: boolean
}

export interface PublicSchedule {
  id: string
  name: string
  description: string
  locationType: LocationType
  locationValue: string
  durationMinutes: number
  timezone: string
  // Day-of-week only (see server/utils/public-schedule.ts) — enough to grey
  // out closed days on the calendar; the authoritative per-date slot list
  // still always comes from fetchAvailability().
  availability: { day: Weekday, enabled: boolean }[]
  bookingWindowDays: number
  minimumNoticeHours: number
  collectPhone: boolean
  questions: PublicScheduleQuestion[]
  slug: string
  owner: { name: string, slug: string, bio: string }
}

export async function fetchPublicSchedule(ownerSlug: string, scheduleSlug: string): Promise<PublicSchedule | null> {
  try {
    return await $fetch<PublicSchedule>(`/api/public/${ownerSlug}/${scheduleSlug}`)
  } catch (error) {
    if (apiErrorStatus(error) === 404) return null
    throw error
  }
}

export interface AvailabilityResponse {
  date: string
  timezone: string
  durationMinutes: number
  slots: string[] // ISO datetimes
}

export async function fetchAvailability(ownerSlug: string, scheduleSlug: string, date: string): Promise<AvailabilityResponse> {
  return await $fetch<AvailabilityResponse>(`/api/public/${ownerSlug}/${scheduleSlug}/availability`, { query: { date } })
}

export interface BookingPayload {
  startAt: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  answers: { questionId: string, answer: string }[]
}

export interface BookingConfirmation {
  confirmationCode: string
  scheduleName: string
  ownerName: string
  startAt: string
  endAt: string
  timezone: string
}

export async function submitBooking(ownerSlug: string, scheduleSlug: string, payload: BookingPayload): Promise<BookingConfirmation> {
  return await $fetch<BookingConfirmation>(`/api/public/${ownerSlug}/${scheduleSlug}/book`, { method: 'POST', body: payload })
}
