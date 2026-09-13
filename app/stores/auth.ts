export interface AuthUser {
  id: string
  name: string
  email: string
  slug: string
  bio: string
  timezone: string
}

interface AuthResponse {
  user: AuthUser
}

// The one genuinely cross-cutting piece of client state in this app (admin
// layout, route middleware, and any page all need "who's logged in") — see
// docs/ARCHITECTURE.md §2. Schedules/appointments stay local `ref`s per page.
export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  // Distinguishes "haven't checked yet" from "checked, and nobody's logged
  // in" — the auth middleware needs this to avoid redirecting to /login
  // before the initial GET /api/auth/me has even had a chance to resolve.
  const initialized = ref(false)

  async function fetchMe() {
    try {
      // On the server (SSR), $fetch calling our own API doesn't automatically
      // carry the browser's cookies — without forwarding them explicitly, a
      // server-rendered first load would always see "logged out" even with a
      // valid session, causing a flash of the wrong content before the client
      // re-checks. Client-side calls already have the cookie via the browser.
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const response = await $fetch<AuthResponse>('/api/auth/me', { headers })
      user.value = response.user
    } catch {
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  async function login(email: string, password: string) {
    const response = await $fetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    user.value = response.user
    initialized.value = true
  }

  async function register(payload: { name: string, email: string, password: string, confirmPassword: string }) {
    const response = await $fetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: payload
    })
    user.value = response.user
    initialized.value = true
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  return { user, initialized, fetchMe, login, register, logout }
})
