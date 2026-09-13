<script setup lang="ts">
useHead({
  title: 'Design System — Appointment Booking'
})

const validationDemo = reactive({ email: '' })
const validationError = computed(() => {
  if (!validationDemo.email) return undefined
  return /.+@.+\..+/.test(validationDemo.email) ? undefined : 'Enter a valid email address'
})

const skeletonDemo = ref(true)
</script>

<template>
  <div class="min-h-screen bg-default">
    <UContainer class="py-12 space-y-16">
      <div>
        <UBadge color="primary" variant="subtle" class="mb-3">Internal reference</UBadge>
        <h1 class="text-3xl font-semibold text-highlighted tracking-tight">
          Design System
        </h1>
        <p class="mt-2 text-muted max-w-2xl">
          The reusable visual foundation for this product — typography, color, spacing, and
          component states. Every screen we build from here on reuses these primitives instead
          of inventing new ones.
        </p>
      </div>

      <!-- Typography -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold text-highlighted">Typography</h2>
        <UCard>
          <div class="space-y-3">
            <p class="text-3xl font-semibold text-highlighted tracking-tight">Page title — 3xl / semibold</p>
            <p class="text-xl font-semibold text-highlighted">Section title — xl / semibold</p>
            <p class="text-base font-medium text-highlighted">Card title — base / medium</p>
            <p class="text-base text-default">Body text — base / regular. Used for primary reading content.</p>
            <p class="text-sm text-muted">Secondary text — sm / muted. Supporting detail that isn't the main focus.</p>
            <p class="text-xs text-dimmed uppercase tracking-wide">Caption — xs / dimmed / uppercase</p>
          </div>
        </UCard>
      </section>

      <!-- Color -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold text-highlighted">Color</h2>
        <UCard>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <div v-for="shade in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]" :key="shade" class="space-y-1.5">
              <div
                class="h-10 rounded-lg border border-default"
                :style="{ background: `var(--ui-color-primary-${shade})` }"
              />
              <p class="text-xs text-muted">primary-{{ shade }}</p>
            </div>
          </div>
          <template #footer>
            <p class="text-sm text-muted">
              Primary is <span class="font-medium text-highlighted">teal</span> — deliberately
              distinct from Google Calendar/Calendly blue. Semantic colors (success/warning/error/info)
              keep their conventional meaning and are left at Nuxt UI's defaults.
            </p>
          </template>
        </UCard>
      </section>

      <!-- Buttons -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold text-highlighted">Buttons</h2>
        <UCard>
          <div class="flex flex-wrap items-center gap-3">
            <UButton>Primary</UButton>
            <UButton color="neutral" variant="subtle">Secondary</UButton>
            <UButton color="neutral" variant="ghost">Ghost</UButton>
            <UButton color="error" variant="soft">Destructive</UButton>
            <UButton loading>Loading</UButton>
            <UButton disabled>Disabled</UButton>
            <UButton icon="i-lucide-plus">With icon</UButton>
            <UButton icon="i-lucide-arrow-right" trailing color="neutral" variant="outline">Trailing icon</UButton>
          </div>
        </UCard>
      </section>

      <!-- Form inputs -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold text-highlighted">Form Inputs</h2>
        <UCard>
          <div class="grid sm:grid-cols-2 gap-6 max-w-2xl">
            <UFormField label="Schedule name" required help="Shown to customers on the booking page">
              <UInput placeholder="30 Minute Meeting" class="w-full" />
            </UFormField>
            <UFormField label="Email" required :error="validationError">
              <UInput v-model="validationDemo.email" type="email" placeholder="you@example.com" class="w-full" />
            </UFormField>
            <UFormField label="Duration">
              <USelect
                :items="['15 minutes', '30 minutes', '45 minutes', '60 minutes']"
                default-value="30 minutes"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Disabled field">
              <UInput placeholder="Not editable" disabled class="w-full" />
            </UFormField>
          </div>
        </UCard>
      </section>

      <!-- Cards & badges -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold text-highlighted">Cards &amp; Badges</h2>
        <div class="grid sm:grid-cols-3 gap-4">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <p class="font-medium text-highlighted">Consultation Call</p>
                <UBadge color="success" variant="subtle">Active</UBadge>
              </div>
            </template>
            <p class="text-sm text-muted">30 min · Google Meet</p>
          </UCard>
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <p class="font-medium text-highlighted">Product Demo</p>
                <UBadge color="neutral" variant="subtle">Disabled</UBadge>
              </div>
            </template>
            <p class="text-sm text-muted">45 min · Phone call</p>
          </UCard>
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <p class="font-medium text-highlighted">Onboarding</p>
                <UBadge color="warning" variant="subtle">Draft</UBadge>
              </div>
            </template>
            <p class="text-sm text-muted">60 min · In person</p>
          </UCard>
        </div>
      </section>

      <!-- Alerts -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold text-highlighted">Alerts</h2>
        <div class="space-y-3">
          <UAlert color="success" variant="subtle" icon="i-lucide-check-circle" title="Schedule published" description="Your booking page is now live and accepting appointments." />
          <UAlert color="error" variant="subtle" icon="i-lucide-circle-x" title="This time slot is no longer available" description="Someone else just booked it. Pick another time to continue." />
          <UAlert color="warning" variant="subtle" icon="i-lucide-triangle-alert" title="Unsaved changes" description="You have changes that haven't been saved yet." />
        </div>
      </section>

      <!-- Empty state -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold text-highlighted">Empty State</h2>
        <UCard>
          <UEmpty
            icon="i-lucide-calendar-plus"
            title="No schedules yet"
            description="Create your first appointment schedule and start accepting bookings."
            :actions="[{ label: 'Create schedule', color: 'primary', icon: 'i-lucide-plus' }]"
          />
        </UCard>
      </section>

      <!-- Loading state -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-highlighted">Loading State</h2>
          <UButton size="xs" color="neutral" variant="outline" @click="skeletonDemo = !skeletonDemo">
            Toggle
          </UButton>
        </div>
        <UCard>
          <div v-if="skeletonDemo" class="space-y-3">
            <USkeleton class="h-4 w-1/3" />
            <USkeleton class="h-4 w-2/3" />
            <USkeleton class="h-24 w-full" />
          </div>
          <div v-else class="space-y-2">
            <p class="font-medium text-highlighted">Content loaded</p>
            <p class="text-sm text-muted">This is what the card looks like once data arrives.</p>
          </div>
        </UCard>
      </section>
    </UContainer>
  </div>
</template>
