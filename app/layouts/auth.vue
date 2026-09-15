<template>
  <div class="min-h-screen flex flex-col bg-default">
    <header class="p-4 sm:p-6 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-highlighted">
        <img src="/logo-transparent.svg" alt="" class="size-6" >
        <span>Schedulo</span>
      </NuxtLink>
      <ColorModeToggle />
    </header>

    <main class="flex-1 flex items-center justify-center px-4 py-8">
      <div class="w-full max-w-sm">
        <slot />
      </div>
    </main>
  </div>
</template>
