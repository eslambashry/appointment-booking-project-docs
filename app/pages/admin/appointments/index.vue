<script setup lang="ts">
import { fetchAppointments, type Appointment, type AppointmentStatus } from '~/utils/mock-appointments'

definePageMeta({ layout: 'admin', title: 'Appointments' })

useHead({
  title: 'Appointments — Schedulo'
})

const loading = ref(true)
const error = ref(false)
const appointments = ref<Appointment[]>([])

async function loadAppointments() {
  loading.value = true
  error.value = false
  try {
    // Status/search filters are applied client-side below (small dataset,
    // instant re-filtering while typing) — the same query params the API
    // supports server-side are still available for a future page that needs
    // to avoid loading everything up front.
    appointments.value = await fetchAppointments()
  } catch (err) {
    if (await redirectIfUnauthenticated(err)) return
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadAppointments)

type FilterValue = 'all' | AppointmentStatus
const filterItems: { label: string, value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Upcoming', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' }
]
const activeFilter = ref<FilterValue>('all')
const search = ref('')

const visibleAppointments = computed(() => {
  const query = search.value.trim().toLowerCase()

  const filtered = appointments.value.filter((appointment) => {
    if (activeFilter.value !== 'all' && appointment.status !== activeFilter.value) return false
    if (!query) return true
    return (
      appointment.customerName.toLowerCase().includes(query)
      || appointment.customerEmail.toLowerCase().includes(query)
      || appointment.scheduleName.toLowerCase().includes(query)
    )
  })

  // Upcoming appointments read best soonest-first; history reads best most-recent-first.
  const historical = activeFilter.value === 'completed' || activeFilter.value === 'cancelled'
  return [...filtered].sort((a, b) => (historical ? b.startAt.localeCompare(a.startAt) : a.startAt.localeCompare(b.startAt)))
})

const statusColor: Record<AppointmentStatus, 'success' | 'neutral' | 'error'> = {
  confirmed: 'success',
  completed: 'neutral',
  cancelled: 'error'
}
const statusLabel: Record<AppointmentStatus, string> = {
  confirmed: 'Upcoming',
  completed: 'Completed',
  cancelled: 'Cancelled'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function openAppointment(id: string) {
  navigateTo(`/admin/appointments/${id}`)
}
</script>

<template>
  <div class="p-4 sm:p-6 space-y-6 max-w-4xl">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted tracking-tight">Appointments</h1>
      <p class="text-sm text-muted mt-1">Every booking your customers have made.</p>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <UTabs v-model="activeFilter" :items="filterItems" :content="false" size="sm" class="w-full sm:w-auto" />
      <UInput v-model="search" icon="i-lucide-search" placeholder="Search by name or email" class="w-full sm:w-64" />
    </div>

    <div v-if="loading" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-20 w-full" />
    </div>

    <UCard v-else-if="error">
      <UEmpty
        icon="i-lucide-circle-alert"
        title="Something went wrong while loading your appointments"
        description="Please check your connection and try again."
        :actions="[{ label: 'Try again', color: 'primary', icon: 'i-lucide-refresh-cw', onClick: loadAppointments }]"
      />
    </UCard>

    <UCard v-else-if="appointments.length === 0">
      <UEmpty
        icon="i-lucide-calendar-x"
        title="No appointments yet"
        description="Once customers book through your schedules, they'll show up here."
      />
    </UCard>

    <UCard v-else-if="visibleAppointments.length === 0">
      <UEmpty
        icon="i-lucide-search-x"
        title="No matching appointments"
        description="Try a different filter or search term."
      />
    </UCard>

    <div v-else class="space-y-3">
      <UCard
        v-for="appointment in visibleAppointments"
        :key="appointment.id"
        as="button"
        type="button"
        class="w-full text-left transition hover:ring-1 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary"
        @click="openAppointment(appointment.id)"
      >
        <div class="flex items-center gap-4">
          <UAvatar :alt="appointment.customerName" size="md" class="shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-highlighted truncate">{{ appointment.customerName }}</p>
            <p class="text-sm text-muted truncate">{{ appointment.scheduleName }}</p>
          </div>
          <div class="text-right shrink-0 hidden sm:block">
            <p class="text-sm text-highlighted">{{ formatDate(appointment.startAt) }}</p>
            <p class="text-sm text-muted">{{ formatTime(appointment.startAt) }}</p>
          </div>
          <UBadge :color="statusColor[appointment.status]" variant="subtle" size="sm" class="shrink-0">
            {{ statusLabel[appointment.status] }}
          </UBadge>
        </div>
        <p class="sm:hidden mt-2 text-sm text-muted">
          {{ formatDate(appointment.startAt) }} · {{ formatTime(appointment.startAt) }}
        </p>
      </UCard>
    </div>
  </div>
</template>
