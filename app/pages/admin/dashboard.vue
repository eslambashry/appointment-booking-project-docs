<script setup lang="ts">
import { fetchAppointments, type Appointment, type AppointmentStatus } from '~/utils/mock-appointments'
import { fetchSchedules } from '~/utils/mock-schedules'

definePageMeta({ layout: 'admin', title: 'Dashboard' })

useHead({
  title: 'Dashboard — Schedulo'
})

const auth = useAuthStore()

const statusColor: Record<AppointmentStatus, 'success' | 'neutral' | 'error'> = {
  confirmed: 'success',
  completed: 'neutral',
  cancelled: 'error'
}

const loading = ref(true)
const error = ref(false)
const allAppointments = ref<Appointment[]>([])
const activeSchedulesCount = ref(0)

async function loadDashboard() {
  loading.value = true
  error.value = false
  try {
    const [appointments, schedules] = await Promise.all([fetchAppointments(), fetchSchedules()])
    allAppointments.value = appointments
    activeSchedulesCount.value = schedules.filter((s) => s.status === 'active').length
  } catch (err) {
    if (await redirectIfUnauthenticated(err)) return
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)

function isToday(date: Date): boolean {
  return date.toDateString() === new Date().toDateString()
}

const todayAppointments = computed(() => allAppointments.value
  .filter((a) => a.status !== 'cancelled' && isToday(new Date(a.startAt)))
  .sort((a, b) => a.startAt.localeCompare(b.startAt)))

const upcomingAppointments = computed(() => allAppointments.value
  .filter((a) => a.status === 'confirmed' && new Date(a.startAt) > new Date() && !isToday(new Date(a.startAt)))
  .sort((a, b) => a.startAt.localeCompare(b.startAt))
  .slice(0, 5))

const statCards = computed(() => [
  { label: "Today's appointments", value: todayAppointments.value.length, icon: 'i-lucide-calendar-check' },
  { label: 'Upcoming appointments', value: upcomingAppointments.value.length, icon: 'i-lucide-calendar-clock' },
  { label: 'Active schedules', value: activeSchedulesCount.value, icon: 'i-lucide-list-checks' }
])

const tabItems = [
  { label: 'Today', value: 'today' },
  { label: 'Upcoming', value: 'upcoming' }
]
const activeTab = ref('today')
const visibleAppointments = computed(() =>
  activeTab.value === 'today' ? todayAppointments.value : upcomingAppointments.value
)

function formatAppointmentTime(appointment: Appointment): string {
  const date = new Date(appointment.startAt)
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (activeTab.value === 'today') return time
  return `${date.toLocaleDateString('en-US', { weekday: 'short' })}, ${time}`
}

const { public: { appUrl } } = useRuntimeConfig()
const bookingLink = computed(() => `${appUrl}/book/${auth.user?.slug}`)
const linkCopied = ref(false)
const toast = useToast()

async function copyBookingLink() {
  try {
    await navigator.clipboard.writeText(bookingLink.value)
    linkCopied.value = true
    toast.add({ title: 'Booking link copied', color: 'success', icon: 'i-lucide-check-circle' })
    setTimeout(() => (linkCopied.value = false), 2000)
  } catch {
    toast.add({
      title: 'Could not copy the link',
      description: 'Your browser blocked clipboard access — copy it manually instead.',
      color: 'error',
      icon: 'i-lucide-circle-x'
    })
  }
}
</script>

<template>
  <div class="p-4 sm:p-6 space-y-8 max-w-5xl">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted tracking-tight">Good to see you, {{ auth.user?.name.split(' ')[0] }}</h1>
        <p class="text-sm text-muted mt-1">Here's what's happening with your bookings.</p>
      </div>
      <UButton to="/admin/schedules" icon="i-lucide-plus" color="primary">
        Create schedule
      </UButton>
    </div>

    <UCard v-if="error">
      <UEmpty
        icon="i-lucide-circle-alert"
        title="Something went wrong while loading your dashboard"
        description="Please check your connection and try again."
        :actions="[{ label: 'Try again', color: 'primary', icon: 'i-lucide-refresh-cw', onClick: loadDashboard }]"
      />
    </UCard>

    <template v-else>
      <div class="grid sm:grid-cols-3 gap-4">
        <UCard v-for="card in statCards" :key="card.label">
          <div class="flex items-center gap-4">
            <div class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UIcon :name="card.icon" class="size-5" />
            </div>
            <div class="min-w-0">
              <p class="text-sm text-muted">{{ card.label }}</p>
              <USkeleton v-if="loading" class="h-7 w-10 mt-1" />
              <p v-else class="text-2xl font-semibold text-highlighted">{{ card.value }}</p>
            </div>
          </div>
        </UCard>
      </div>

      <div>
        <h2 class="text-sm font-medium text-muted mb-3">Quick actions</h2>
        <div class="grid sm:grid-cols-3 gap-4">
          <UCard
            as="button"
            type="button"
            class="text-left transition hover:ring-1 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary"
            @click="navigateTo('/admin/schedules')"
          >
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-calendar-plus" class="size-5 text-primary shrink-0" />
              <div class="min-w-0">
                <p class="text-sm font-medium text-highlighted">Create a schedule</p>
                <p class="text-xs text-muted truncate">Set up a new appointment type</p>
              </div>
            </div>
          </UCard>

          <UCard
            as="button"
            type="button"
            class="text-left transition hover:ring-1 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary"
            @click="navigateTo('/admin/calendar')"
          >
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-calendar-days" class="size-5 text-primary shrink-0" />
              <div class="min-w-0">
                <p class="text-sm font-medium text-highlighted">View calendar</p>
                <p class="text-xs text-muted truncate">See every upcoming appointment</p>
              </div>
            </div>
          </UCard>

          <UCard
            as="button"
            type="button"
            class="text-left transition hover:ring-1 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary"
            @click="copyBookingLink"
          >
            <div class="flex items-center gap-3">
              <UIcon :name="linkCopied ? 'i-lucide-check' : 'i-lucide-link'" class="size-5 text-primary shrink-0" />
              <div class="min-w-0">
                <p class="text-sm font-medium text-highlighted">{{ linkCopied ? 'Copied!' : 'Copy booking link' }}</p>
                <p class="text-xs text-muted truncate">{{ bookingLink }}</p>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-medium text-highlighted">Appointments</h2>
            <UTabs v-model="activeTab" :items="tabItems" :content="false" size="xs" class="w-auto" />
          </div>
        </template>

        <div v-if="loading" class="space-y-3 p-4">
          <USkeleton v-for="i in 3" :key="i" class="h-14 w-full" />
        </div>

        <UEmpty
          v-else-if="visibleAppointments.length === 0"
          icon="i-lucide-calendar-x"
          :title="activeTab === 'today' ? 'Nothing on today\'s calendar' : 'No upcoming appointments'"
          :description="activeTab === 'today'
            ? 'Enjoy the quiet — new bookings will show up here the moment they come in.'
            : 'Once customers book ahead, their appointments will appear here.'"
          class="p-6"
        />

        <ul v-else class="divide-y divide-default px-4">
          <li v-for="appointment in visibleAppointments" :key="appointment.id" class="flex items-center justify-between gap-4 py-3">
            <div class="flex min-w-0 items-center gap-3">
              <UAvatar :alt="appointment.customerName" size="sm" />
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-highlighted">{{ appointment.customerName }}</p>
                <p class="truncate text-xs text-muted">{{ appointment.scheduleName }}</p>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <span class="text-sm text-muted">{{ formatAppointmentTime(appointment) }}</span>
              <UBadge :color="statusColor[appointment.status]" variant="subtle" size="sm" class="capitalize">
                {{ appointment.status }}
              </UBadge>
            </div>
          </li>
        </ul>

        <template #footer>
          <UButton to="/admin/appointments" color="neutral" variant="link" trailing-icon="i-lucide-arrow-right" size="sm" class="p-0">
            View all appointments
          </UButton>
        </template>
      </UCard>
    </template>
  </div>
</template>
