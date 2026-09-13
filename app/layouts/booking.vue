<script setup lang="ts">
const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value) => {
    colorMode.preference = value ? 'dark' : 'light'
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-default">
    <div class="flex justify-end p-4">
      <UButton
        :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
        color="neutral"
        variant="ghost"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="isDark = !isDark"
      />
    </div>

    <main class="flex-1 px-4 pb-12">
      <slot />
    </main>

    <footer class="py-6 text-center">
      <NuxtLink to="/" class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-highlighted transition-colors">
        Powered by
        <span class="inline-flex items-center gap-1 font-medium">
          <UIcon name="i-lucide-calendar-check-2" class="size-3.5 text-primary" />
          Schedulo
        </span>
      </NuxtLink>
    </footer>
  </div>
</template>
