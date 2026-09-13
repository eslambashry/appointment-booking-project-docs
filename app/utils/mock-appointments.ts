// Shared appointment types used across the admin dashboard, calendar, and
// appointments pages. No longer holds mock data (Task 020 replaced it with
// real API calls below) — kept in this file/name since only its contents
// changed, not what it's for.

export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled'

export interface AppointmentAnswer {
  question: string
  answer: string
}

export interface Appointment {
  id: string
  scheduleId: string
  scheduleName: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  startAt: string // ISO datetime
  endAt: string // ISO datetime
  timezone: string
  status: AppointmentStatus
  answers: AppointmentAnswer[]
  confirmationCode: string
}

export function dateKey(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

// --- Real API integration (Task 020) ---

// GET /api/appointments populates scheduleId with just {_id, name} (server
// side, Task 020) rather than making every consumer of this list fetch
// schedules separately and join them by hand.
interface ApiAppointment {
  _id: string
  scheduleId: { _id: string, name: string } | string
  customerName: string
  customerEmail: string
  customerPhone?: string
  startAt: string
  endAt: string
  timezone: string
  status: AppointmentStatus
  answers: AppointmentAnswer[]
  confirmationCode: string
}

function toClientAppointment(raw: ApiAppointment): Appointment {
  const populated = typeof raw.scheduleId === 'object'
  return {
    id: raw._id,
    scheduleId: populated ? (raw.scheduleId as { _id: string })._id : (raw.scheduleId as string),
    scheduleName: populated ? (raw.scheduleId as { name: string }).name : 'Unknown schedule',
    customerName: raw.customerName,
    customerEmail: raw.customerEmail,
    customerPhone: raw.customerPhone,
    startAt: raw.startAt,
    endAt: raw.endAt,
    timezone: raw.timezone,
    status: raw.status,
    answers: raw.answers,
    confirmationCode: raw.confirmationCode
  }
}

export interface AppointmentFilters {
  status?: AppointmentStatus
  search?: string
}

export async function fetchAppointments(filters: AppointmentFilters = {}): Promise<Appointment[]> {
  const raw = await $fetch<ApiAppointment[]>('/api/appointments', { query: filters })
  return raw.map(toClientAppointment)
}

export async function fetchAppointment(id: string): Promise<Appointment | null> {
  try {
    const raw = await $fetch<ApiAppointment>(`/api/appointments/${id}`)
    return toClientAppointment(raw)
  } catch (error) {
    if (apiErrorStatus(error) === 404) return null
    throw error
  }
}

export async function cancelAppointment(id: string): Promise<Appointment> {
  const raw = await $fetch<ApiAppointment>(`/api/appointments/${id}`, {
    method: 'PATCH',
    body: { status: 'cancelled' }
  })
  return toClientAppointment(raw)
}
