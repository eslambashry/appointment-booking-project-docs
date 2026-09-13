<script setup lang="ts">
import ScheduleForm from '~/components/schedules/ScheduleForm.vue'
import { fetchSchedule, type Schedule } from '~/utils/mock-schedules'

definePageMeta({ layout: 'admin', title: 'Edit schedule' })

const route = useRoute()
const loading = ref(true)
const error = ref(false)
const schedule = ref<Schedule | null>(null)

async function loadSchedule() {
  loading.value = true
  error.value = false
  try {
    schedule.value = await fetchSchedule(route.params.id as string)
  } catch (err) {
    if (await redirectIfUnauthenticated(err)) return
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadSchedule)

useHead(() => ({
  title: `${schedule.value ? `Edit ${schedule.value.name}` : 'Edit schedule'} — Schedulo`
}))
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="max-w-3xl mx-auto mb-6">
      <UButton to="/admin/schedules" color="neutral" variant="link" icon="i-lucide-arrow-left" class="p-0 mb-2">
        Schedules
      </UButton>
      <template v-if="schedule">
        <h1 class="text-2xl font-semibold text-highlighted tracking-tight">Edit {{ schedule.name }}</h1>
        <p class="text-sm text-muted mt-1">Changes apply to your live booking page once saved.</p>
      </template>
    </div>

    <div v-if="loading" class="max-w-3xl mx-auto space-y-4">
      <USkeleton class="h-10 w-full" />
      <USkeleton class="h-64 w-full" />
    </div>

    <UCard v-else-if="error" class="max-w-3xl mx-auto">
      <UEmpty
        icon="i-lucide-circle-alert"
        title="Something went wrong while loading this schedule"
        description="Please check your connection and try again."
        :actions="[{ label: 'Try again', color: 'primary', icon: 'i-lucide-refresh-cw', onClick: loadSchedule }]"
      />
    </UCard>

    <UCard v-else-if="!schedule" class="max-w-3xl mx-auto">
      <UEmpty
        icon="i-lucide-search-x"
        title="Schedule not found"
        description="This schedule may have been removed, or the link is incorrect."
        :actions="[{ label: 'Back to schedules', color: 'primary', to: '/admin/schedules' }]"
      />
    </UCard>

    <ScheduleForm v-else mode="edit" :initial="schedule" />
  </div>
</template>
