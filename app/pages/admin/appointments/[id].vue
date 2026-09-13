<script setup lang="ts">
import { fetchAppointment, cancelAppointment, type Appointment, type AppointmentStatus } from '~/utils/mock-appointments'

definePageMeta({ layout: 'admin', title: 'Appointment details' })

const route = useRoute()
const toast = useToast()

const loading = ref(true)
const error = ref(false)
const appointment = ref<Appointment | null>(null)

async function loadAppointment() {
  loading.value = true
  error.value = false
  try {
    appointment.value = await fetchAppointment(route.params.id as string)
  } catch (err) {
    if (await redirectIfUnauthenticated(err)) return
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadAppointment)

useHead({
  title: 'Appointment details — Schedulo'
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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const cancelDialogOpen = ref(false)
const cancelling = ref(false)

async function confirmCancel() {
  if (!appointment.value) return
  cancelling.value = true
  try {
    appointment.value = await cancelAppointment(appointment.value.id)
    toast.add({
      title: 'Appointment cancelled',
      description: `${appointment.value.customerName} will need to book a new time.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } catch (err) {
    if (await redirectIfUnauthenticated(err)) return
    toast.add({ title: apiErrorMessage(err, 'Could not cancel this appointment'), color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    cancelling.value = false
    cancelDialogOpen.value = false
  }
}
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="max-w-2xl mx-auto mb-6">
      <UButton to="/admin/appointments" color="neutral" variant="link" icon="i-lucide-arrow-left" class="p-0">
        Appointments
      </UButton>
    </div>

    <div v-if="loading" class="max-w-2xl mx-auto space-y-4">
      <USkeleton class="h-8 w-1/2" />
      <USkeleton class="h-40 w-full" />
      <USkeleton class="h-32 w-full" />
    </div>

    <UCard v-else-if="error" class="max-w-2xl mx-auto">
      <UEmpty
        icon="i-lucide-circle-alert"
        title="Something went wrong while loading this appointment"
        description="Please check your connection and try again."
        :actions="[{ label: 'Try again', color: 'primary', icon: 'i-lucide-refresh-cw', onClick: loadAppointment }]"
      />
    </UCard>

    <UCard v-else-if="!appointment" class="max-w-2xl mx-auto">
      <UEmpty
        icon="i-lucide-search-x"
        title="Appointment not found"
        description="This appointment may have been removed, or the link is incorrect."
        :actions="[{ label: 'Back to appointments', color: 'primary', to: '/admin/appointments' }]"
      />
    </UCard>

    <div v-else class="max-w-2xl mx-auto space-y-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-highlighted tracking-tight">{{ appointment.scheduleName }}</h1>
          <p class="text-sm text-muted mt-1">Confirmation code: {{ appointment.confirmationCode }}</p>
        </div>
        <UBadge :color="statusColor[appointment.status]" variant="subtle">
          {{ statusLabel[appointment.status] }}
        </UBadge>
      </div>

      <UCard>
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <UIcon name="i-lucide-calendar-days" class="size-5" />
          </div>
          <div>
            <p class="text-sm font-medium text-highlighted">{{ formatDateTime(appointment.startAt) }}</p>
            <p class="text-sm text-muted">{{ formatTime(appointment.startAt) }} – {{ formatTime(appointment.endAt) }} ({{ appointment.timezone }})</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <p class="font-medium text-highlighted">Customer</p>
        </template>
        <dl class="space-y-2 text-sm">
          <div class="flex items-center justify-between gap-4">
            <dt class="text-muted">Name</dt>
            <dd class="text-highlighted font-medium">{{ appointment.customerName }}</dd>
          </div>
          <div class="flex items-center justify-between gap-4">
            <dt class="text-muted">Email</dt>
            <dd class="text-highlighted">{{ appointment.customerEmail }}</dd>
          </div>
          <div v-if="appointment.customerPhone" class="flex items-center justify-between gap-4">
            <dt class="text-muted">Phone</dt>
            <dd class="text-highlighted">{{ appointment.customerPhone }}</dd>
          </div>
        </dl>
      </UCard>

      <UCard v-if="appointment.answers.length">
        <template #header>
          <p class="font-medium text-highlighted">Their answers</p>
        </template>
        <div class="space-y-3">
          <div v-for="(answer, index) in appointment.answers" :key="index">
            <p class="text-xs text-muted">{{ answer.question }}</p>
            <p class="text-sm text-highlighted">{{ answer.answer }}</p>
          </div>
        </div>
      </UCard>

      <div v-if="appointment.status === 'confirmed'" class="flex justify-end">
        <UButton color="error" variant="subtle" icon="i-lucide-calendar-x" @click="cancelDialogOpen = true">
          Cancel appointment
        </UButton>
      </div>

      <UModal v-model:open="cancelDialogOpen" title="Cancel this appointment?" description="The customer will not be automatically notified — this only updates their status here.">
        <template #footer>
          <UButton color="neutral" variant="subtle" :disabled="cancelling" @click="cancelDialogOpen = false">
            Keep appointment
          </UButton>
          <UButton color="error" :loading="cancelling" @click="confirmCancel">
            Cancel appointment
          </UButton>
        </template>
      </UModal>
    </div>
  </div>
</template>
