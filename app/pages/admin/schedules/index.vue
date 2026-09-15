<script setup lang="ts">
import { fetchSchedules, availabilitySummary, LOCATION_TYPE_LABELS, type Schedule } from '~/utils/mock-schedules'

definePageMeta({ layout: 'admin', title: 'Schedules' })

useHead({
  title: 'Schedules — Schedulo'
})

const auth = useAuthStore()
const loading = ref(true)
const error = ref(false)
const schedules = ref<Schedule[]>([])

async function loadSchedules() {
  loading.value = true
  error.value = false
  try {
    schedules.value = await fetchSchedules()
  } catch (err) {
    if (await redirectIfUnauthenticated(err)) return
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadSchedules)

const toast = useToast()
const copiedId = ref<string | null>(null)
const { public: { appUrl } } = useRuntimeConfig()
async function copyLink(schedule: Schedule) {
  try {
    await navigator.clipboard.writeText(`${appUrl}/book/${auth.user?.slug}/${schedule.slug}`)
    copiedId.value = schedule.id
    toast.add({ title: 'Booking link copied', color: 'success', icon: 'i-lucide-check-circle' })
    setTimeout(() => (copiedId.value = null), 2000)
  } catch {
    toast.add({ title: 'Could not copy the link', color: 'error', icon: 'i-lucide-circle-x' })
  }
}
</script>

<template>
  <div class="p-4 sm:p-6 space-y-6 max-w-4xl">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted tracking-tight">Schedules</h1>
        <p class="text-sm text-muted mt-1">Every appointment type you offer, and where its booking page lives.</p>
      </div>
      <UButton to="/admin/schedules/new" icon="i-lucide-plus" color="primary">
        Create schedule
      </UButton>
    </div>

    <div v-if="loading" class="space-y-3">
      <USkeleton v-for="i in 3" :key="i" class="h-24 w-full" />
    </div>

    <UCard v-else-if="error">
      <UEmpty
        icon="i-lucide-circle-alert"
        title="Something went wrong while loading your schedules"
        description="Please check your connection and try again."
        :actions="[{ label: 'Try again', color: 'primary', icon: 'i-lucide-refresh-cw', onClick: loadSchedules }]"
      />
    </UCard>

    <UCard v-else-if="schedules.length === 0">
      <UEmpty
        icon="i-lucide-calendar-plus"
        title="No schedules yet"
        description="Create your first appointment schedule and start accepting bookings."
        :actions="[{ label: 'Create schedule', color: 'primary', icon: 'i-lucide-plus', to: '/admin/schedules/new' }]"
      />
    </UCard>

    <div v-else class="space-y-3">
      <UCard v-for="schedule in schedules" :key="schedule.id">
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="min-w-0 flex-1 space-y-1.5">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-medium text-highlighted">{{ schedule.name }}</p>
              <UBadge :color="schedule.status === 'active' ? 'success' : 'neutral'" variant="subtle" size="sm">
                {{ schedule.status === 'active' ? 'Active' : 'Disabled' }}
              </UBadge>
            </div>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span class="inline-flex items-center gap-1">
                <UIcon name="i-lucide-clock" class="size-3.5" />
                {{ schedule.durationMinutes }} min
              </span>
              <span class="inline-flex items-center gap-1">
                <UIcon name="i-lucide-map-pin" class="size-3.5" />
                {{ LOCATION_TYPE_LABELS[schedule.locationType] }}
              </span>
              <span class="inline-flex items-center gap-1">
                <UIcon name="i-lucide-calendar-days" class="size-3.5" />
                {{ availabilitySummary(schedule.availability) }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <UButton
              :icon="copiedId === schedule.id ? 'i-lucide-check' : 'i-lucide-link'"
              color="neutral"
              variant="outline"
              size="sm"
              :aria-label="`Copy booking link for ${schedule.name}`"
              @click="copyLink(schedule)"
            >
              {{ copiedId === schedule.id ? 'Copied' : 'Copy link' }}
            </UButton>
            <UButton :to="`/admin/schedules/${schedule.id}/edit`" color="neutral" variant="subtle" size="sm" icon="i-lucide-pencil">
              Edit
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
