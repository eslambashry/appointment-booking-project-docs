<script setup lang="ts">
const navLinks = [
  { label: 'How it works', to: '/#how-it-works' },
  { label: 'Features', to: '/#features' }
]
</script>

<template>
  <div class="min-h-screen flex flex-col bg-default">
    <a
      href="#main-content"
      class="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-inverted"
    >
      Skip to main content
    </a>

    <header class="sticky top-0 z-40 border-b border-default bg-default/80 backdrop-blur">
      <UContainer class="flex h-16 items-center justify-between gap-4">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-highlighted">
          <img src="/logo-transparent.svg" alt="" class="size-6" >
          <span>Schedulo</span>
        </NuxtLink>

        <nav class="hidden md:flex items-center gap-6">
          <ULink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="text-sm text-muted hover:text-highlighted transition-colors"
          >
            {{ link.label }}
          </ULink>
        </nav>

        <div class="flex items-center gap-2">
          <ColorModeToggle />
          <UButton to="/login" color="neutral" variant="ghost" class="hidden sm:inline-flex">
            Log in
          </UButton>
          <UButton to="/register" color="primary">
            Get started
          </UButton>
        </div>
      </UContainer>
    </header>

    <main id="main-content" class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-default">
      <UContainer class="py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
        <p>© {{ new Date().getFullYear() }} Schedulo. All rights reserved.</p>
        <div class="flex items-center gap-2 text-highlighted font-medium">
          <img src="/logo-transparent.svg" alt="" class="size-5" >
          Schedulo
        </div>
      </UContainer>
    </footer>
  </div>
</template>
