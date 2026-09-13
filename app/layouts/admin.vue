<script setup lang="ts">
const route = useRoute()
const auth = useAuthStore()

async function logout() {
  await auth.logout()
  await navigateTo('/')
}

const navItems = [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/admin/dashboard' },
  { label: 'Calendar', icon: 'i-lucide-calendar-days', to: '/admin/calendar' },
  { label: 'Schedules', icon: 'i-lucide-calendar-clock', to: '/admin/schedules' },
  { label: 'Appointments', icon: 'i-lucide-list-checks', to: '/admin/appointments' },
  { label: 'Booking Page', icon: 'i-lucide-link', to: '/admin/booking-page' },
  { label: 'Settings', icon: 'i-lucide-settings', to: '/admin/settings' }
]

const pageTitle = computed(() => (route.meta.title as string | undefined) ?? 'Dashboard')
</script>

<template>
  <div>
    <a
      href="#main-content"
      class="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-inverted"
    >
      Skip to main content
    </a>

    <UDashboardGroup class="min-h-screen">
      <UDashboardSidebar collapsible>
        <template #header="{ collapsed }">
          <NuxtLink to="/admin/dashboard" class="flex items-center gap-2 font-semibold text-highlighted px-1">
            <UIcon name="i-lucide-calendar-check-2" class="size-5 text-primary shrink-0" />
            <span v-if="!collapsed">Schedulo</span>
          </NuxtLink>
        </template>

        <UNavigationMenu :items="navItems" orientation="vertical" />

        <template #footer="{ collapsed }">
          <div class="w-full space-y-1">
            <div v-if="auth.user" class="flex items-center gap-2.5 px-2 py-1.5">
              <UAvatar :alt="auth.user.name" size="sm" />
              <div v-if="!collapsed" class="min-w-0">
                <p class="text-sm font-medium text-highlighted truncate">{{ auth.user.name }}</p>
                <p class="text-xs text-muted truncate">{{ auth.user.email }}</p>
              </div>
            </div>
            <UButton
              icon="i-lucide-log-out"
              color="neutral"
              variant="ghost"
              :block="!collapsed"
              :square="collapsed"
              :label="collapsed ? undefined : 'Log out'"
              aria-label="Log out"
              @click="logout"
            />
          </div>
        </template>
      </UDashboardSidebar>

      <UDashboardPanel>
        <template #header>
          <UDashboardNavbar :title="pageTitle" />
        </template>

        <template #body>
          <main id="main-content">
            <slot />
          </main>
        </template>
      </UDashboardPanel>
    </UDashboardGroup>
  </div>
</template>
