// Protects /admin/** and redirects an already-signed-in visitor away from
// /login and /register — runs on every navigation (global), but only ever
// does real work for those two route shapes. A per-page `definePageMeta({
// middleware: 'auth' })` on each of the six admin pages would work too, but
// would need remembering on every new admin page added later; this can't be
// forgotten.
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  const isAdminRoute = to.path.startsWith('/admin')
  const isGuestOnlyRoute = to.path === '/login' || to.path === '/register'
  if (!isAdminRoute && !isGuestOnlyRoute) return

  if (!auth.initialized) {
    await auth.fetchMe()
  }

  if (isAdminRoute && !auth.user) {
    return navigateTo('/login')
  }

  if (isGuestOnlyRoute && auth.user) {
    return navigateTo('/admin/dashboard')
  }
})
