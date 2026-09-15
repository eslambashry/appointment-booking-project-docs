<template>
  <div class="min-h-screen flex flex-col bg-default">
    <div class="flex justify-end p-4">
      <ColorModeToggle />
    </div>

    <main class="flex-1 px-4 pb-12">
      <slot />
    </main>

    <footer class="py-6 text-center">
      <NuxtLink to="/" class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-highlighted transition-colors">
        Powered by
        <span class="inline-flex items-center gap-1 font-medium">
          <img src="/logo-transparent.svg" alt="" class="size-4" >
          Schedulo
        </span>
      </NuxtLink>
    </footer>
  </div>
</template>
