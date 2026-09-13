<script setup lang="ts">
import { fetchAppointments, type Appointment, type AppointmentStatus } from '~/utils/mock-appointments'

definePageMeta({ layout: 'admin', title: 'Calendar' })

useHead({
  title: 'Calendar — Schedulo'
})

type ViewMode = 'month' | 'week' | 'day'

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

// Monday-first index (0 = Monday .. 6 = Sunday), matching the availability builder's week convention.
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

const today = startOfDay(new Date())
const view = ref<ViewMode>('month')
const referenceDate = ref(startOfDay(new Date()))

const viewItems = [
  { label: 'Month', value: 'month' },
  { label: 'Week', value: 'week' },
  { label: 'Day', value: 'day' }
]

const loading = ref(true)
const error = ref(false)
const appointments = ref<Appointment[]>([])

async function loadAppointments() {
  loading.value = true
  error.value = false
  try {
    appointments.value = await fetchAppointments()
  } catch (err) {
    if (await redirectIfUnauthenticated(err)) return
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadAppointments)

const appointmentsByDate = computed(() => {
  const map = new Map<string, Appointment[]>()
  for (const appointment of appointments.value) {
    const key = localDateKey(new Date(appointment.startAt))
    const bucket = map.get(key)
    if (bucket) bucket.push(appointment)
    else map.set(key, [appointment])
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => a.startAt.localeCompare(b.startAt))
  }
  return map
})

function appointmentsOn(date: Date): Appointment[] {
  return appointmentsByDate.value.get(localDateKey(date)) ?? []
}

function goToday() {
  referenceDate.value = startOfDay(new Date())
}
function goPrevious() {
  const next = new Date(referenceDate.value)
  if (view.value === 'month') next.setMonth(next.getMonth() - 1)
  else if (view.value === 'week') next.setDate(next.getDate() - 7)
  else next.setDate(next.getDate() - 1)
  referenceDate.value = next
}
function goNext() {
  const next = new Date(referenceDate.value)
  if (view.value === 'month') next.setMonth(next.getMonth() + 1)
  else if (view.value === 'week') next.setDate(next.getDate() + 7)
  else next.setDate(next.getDate() + 1)
  referenceDate.value = next
}
function openDay(date: Date) {
  referenceDate.value = startOfDay(date)
  view.value = 'day'
}

interface CalendarCell {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  appointments: Appointment[]
}

const monthCells = computed<CalendarCell[]>(() => {
  const first = new Date(referenceDate.value.getFullYear(), referenceDate.value.getMonth(), 1)
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - mondayIndex(first))

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + i)
    return {
      date,
      isCurrentMonth: date.getMonth() === referenceDate.value.getMonth(),
      isToday: localDateKey(date) === localDateKey(today),
      appointments: appointmentsOn(date)
    }
  })
})

const weekDays = computed<CalendarCell[]>(() => {
  const start = new Date(referenceDate.value)
  start.setDate(referenceDate.value.getDate() - mondayIndex(referenceDate.value))

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    return {
      date,
      isCurrentMonth: true,
      isToday: localDateKey(date) === localDateKey(today),
      appointments: appointmentsOn(date)
    }
  })
})

const dayAppointments = computed(() => appointmentsOn(referenceDate.value))

const periodLabel = computed(() => {
  if (view.value === 'month') {
    return referenceDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  if (view.value === 'week') {
    const days = weekDays.value
    const start = days[0]!.date
    const end = days[6]!.date
    const sameMonth = start.getMonth() === end.getMonth()
    const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endLabel = end.toLocaleDateString(
      'en-US',
      sameMonth ? { day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }
    )
    return `${startLabel} – ${endLabel}`
  }
  return referenceDate.value.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
})

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const statusColor: Record<AppointmentStatus, 'success' | 'neutral' | 'error'> = {
  confirmed: 'success',
  completed: 'neutral',
  cancelled: 'error'
}

function chipClass(status: AppointmentStatus): string {
  if (status === 'confirmed') return 'bg-success/10 text-success hover:bg-success/15'
  if (status === 'cancelled') return 'bg-error/10 text-error line-through hover:bg-error/15'
  return 'bg-elevated text-muted hover:bg-accented'
}

function dotClass(status: AppointmentStatus): string {
  if (status === 'confirmed') return 'bg-success'
  if (status === 'cancelled') return 'bg-error'
  return 'bg-neutral-400 dark:bg-neutral-500'
}

const detailsOpen = ref(false)
const selectedAppointment = ref<Appointment | null>(null)
function openDetails(appointment: Appointment) {
  selectedAppointment.value = appointment
  detailsOpen.value = true
}
</script>

<template>
  <div class="p-4 sm:p-6 space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted tracking-tight">Calendar</h1>
        <p class="text-sm text-muted mt-1">Every appointment, at a glance.</p>
      </div>
      <URadioGroup
        v-model="view"
        :items="viewItems"
        variant="card"
        indicator="hidden"
        orientation="horizontal"
        class="grid grid-cols-3 w-full sm:w-64"
      />
    </div>

    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-1">
        <UButton icon="i-lucide-chevron-left" color="neutral" variant="ghost" aria-label="Previous period" @click="goPrevious" />
        <UButton icon="i-lucide-chevron-right" color="neutral" variant="ghost" aria-label="Next period" @click="goNext" />
        <UButton color="neutral" variant="outline" size="sm" class="ml-1" @click="goToday">Today</UButton>
      </div>
      <p class="text-sm sm:text-base font-medium text-highlighted">{{ periodLabel }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="rounded-lg border border-default overflow-hidden">
      <div class="grid grid-cols-7 gap-px bg-muted">
        <USkeleton v-for="i in 42" :key="i" class="h-24 rounded-none" />
      </div>
    </div>

    <UCard v-else-if="error">
      <UEmpty
        icon="i-lucide-circle-alert"
        title="Something went wrong while loading your calendar"
        description="Please check your connection and try again."
        :actions="[{ label: 'Try again', color: 'primary', icon: 'i-lucide-refresh-cw', onClick: loadAppointments }]"
      />
    </UCard>

    <!-- Month view -->
    <div v-else-if="view === 'month'" class="rounded-lg border border-default overflow-hidden">
      <div class="grid grid-cols-7 bg-muted text-xs font-medium text-muted">
        <div v-for="label in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" :key="label" class="p-2 text-center border-b border-default">
          {{ label }}
        </div>
      </div>
      <div class="grid grid-cols-7 gap-px bg-muted">
        <div v-for="cell in monthCells" :key="cell.date.toISOString()" class="min-h-24 bg-default p-1.5" :class="!cell.isCurrentMonth && 'bg-muted/40'">
          <UButton
            :label="String(cell.date.getDate())"
            size="xs"
            :color="cell.isToday ? 'primary' : 'neutral'"
            :variant="cell.isToday ? 'solid' : 'ghost'"
            class="rounded-full size-6 justify-center p-0"
            :class="!cell.isCurrentMonth && !cell.isToday && 'text-dimmed'"
            :aria-label="`Open ${cell.date.toDateString()}`"
            @click="openDay(cell.date)"
          />
          <!-- Mobile: seven narrow columns can't fit readable text chips, so cells
               show compact status dots instead — tap the date number to drill into
               Day view, which has room for the full readable list. -->
          <div v-if="cell.appointments.length" class="flex sm:hidden items-center gap-1 flex-wrap mt-1 px-0.5">
            <span
              v-for="appointment in cell.appointments.slice(0, 4)"
              :key="appointment.id"
              class="size-1.5 rounded-full shrink-0"
              :class="dotClass(appointment.status)"
            />
          </div>

          <div class="hidden sm:block mt-1 space-y-1">
            <button
              v-for="appointment in cell.appointments.slice(0, 2)"
              :key="appointment.id"
              type="button"
              class="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight transition"
              :class="chipClass(appointment.status)"
              @click="openDetails(appointment)"
            >
              {{ formatTime(appointment.startAt) }} {{ appointment.customerName }}
            </button>
            <p v-if="cell.appointments.length > 2" class="px-1.5 text-[11px] text-muted">
              +{{ cell.appointments.length - 2 }} more
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Week view -->
    <div v-else-if="view === 'week'" class="grid grid-cols-1 sm:grid-cols-7 gap-3">
      <div v-for="day in weekDays" :key="day.date.toISOString()" class="rounded-lg border border-default p-3">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium" :class="day.isToday ? 'text-primary' : 'text-highlighted'">
            {{ day.date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }) }}
          </p>
          <UBadge v-if="day.isToday" color="primary" variant="subtle" size="sm">Today</UBadge>
        </div>
        <p v-if="day.appointments.length === 0" class="text-xs text-dimmed py-4 text-center">No appointments</p>
        <div v-else class="space-y-1.5">
          <button
            v-for="appointment in day.appointments"
            :key="appointment.id"
            type="button"
            class="block w-full rounded-md px-2 py-1.5 text-left text-xs transition"
            :class="chipClass(appointment.status)"
            @click="openDetails(appointment)"
          >
            <p class="font-medium truncate">{{ formatTime(appointment.startAt) }} · {{ appointment.customerName }}</p>
            <p class="truncate opacity-80">{{ appointment.scheduleName }}</p>
          </button>
        </div>
      </div>
    </div>

    <!-- Day view -->
    <div v-else class="max-w-2xl">
      <UCard v-if="dayAppointments.length === 0">
        <UEmpty icon="i-lucide-calendar-x" title="No appointments this day" description="Nothing scheduled — enjoy the quiet." />
      </UCard>
      <div v-else class="space-y-3">
        <UCard
          v-for="appointment in dayAppointments"
          :key="appointment.id"
          as="button"
          type="button"
          class="w-full text-left transition hover:ring-1 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary"
          @click="openDetails(appointment)"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="text-sm font-medium text-highlighted">
                {{ formatTime(appointment.startAt) }} – {{ formatTime(appointment.endAt) }}
              </p>
              <p class="text-sm text-muted truncate">{{ appointment.customerName }} · {{ appointment.scheduleName }}</p>
            </div>
            <UBadge :color="statusColor[appointment.status]" variant="subtle" size="sm" class="capitalize shrink-0">
              {{ appointment.status }}
            </UBadge>
          </div>
        </UCard>
      </div>
    </div>

    <UModal
      v-model:open="detailsOpen"
      :title="selectedAppointment?.scheduleName"
      :description="selectedAppointment ? formatTime(selectedAppointment.startAt) + ' – ' + formatTime(selectedAppointment.endAt) : undefined"
    >
      <template #body>
        <div v-if="selectedAppointment" class="space-y-4">
          <UBadge :color="statusColor[selectedAppointment.status]" variant="subtle" class="capitalize">
            {{ selectedAppointment.status }}
          </UBadge>

          <dl class="space-y-2 text-sm">
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted">Customer</dt>
              <dd class="text-highlighted font-medium">{{ selectedAppointment.customerName }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted">Email</dt>
              <dd class="text-highlighted">{{ selectedAppointment.customerEmail }}</dd>
            </div>
            <div v-if="selectedAppointment.customerPhone" class="flex items-center justify-between gap-4">
              <dt class="text-muted">Phone</dt>
              <dd class="text-highlighted">{{ selectedAppointment.customerPhone }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted">Timezone</dt>
              <dd class="text-highlighted">{{ selectedAppointment.timezone }}</dd>
            </div>
          </dl>

          <div v-if="selectedAppointment.answers.length" class="space-y-3 border-t border-default pt-3">
            <div v-for="(answer, index) in selectedAppointment.answers" :key="index">
              <p class="text-xs text-muted">{{ answer.question }}</p>
              <p class="text-sm text-highlighted">{{ answer.answer }}</p>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <UButton color="neutral" variant="subtle" @click="detailsOpen = false">Close</UButton>
      </template>
    </UModal>
  </div>
</template>
