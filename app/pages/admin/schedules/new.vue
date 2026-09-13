<script setup lang="ts">
import ScheduleForm from '~/components/schedules/ScheduleForm.vue'

definePageMeta({ layout: 'admin', title: 'Create schedule' })

useHead({
  title: 'Create a schedule — Schedulo'
})
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="max-w-3xl mx-auto mb-6">
      <UButton to="/admin/schedules" color="neutral" variant="link" icon="i-lucide-arrow-left" class="p-0 mb-2">
        Schedules
      </UButton>
      <h1 class="text-2xl font-semibold text-highlighted tracking-tight">Create a schedule</h1>
      <p class="text-sm text-muted mt-1">A few steps and your booking page is live.</p>
    </div>

    <ScheduleForm mode="create" />
  </div>
</template>
