// $fetch throws an error whose `.data` is the server's own createError body
// ({ statusCode, statusMessage, message }, per server/utils' consistent error
// shape). This extracts the human-readable message consistently everywhere a
// mutation can fail, instead of every page re-deriving it slightly differently.
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error && typeof error === 'object') {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) return data.message
    const statusMessage = (error as { statusMessage?: string }).statusMessage
    if (statusMessage) return statusMessage
  }
  return fallback
}

export function apiErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    return (error as { statusCode?: number }).statusCode
  }
  return undefined
}

// A session can expire (or be revoked) while an admin page is open — without
// this, a data fetch that gets a 401 just sets a generic error.value = true,
// showing "Something went wrong — Try again," which can never actually
// succeed since the real problem is "you're signed out," not a network
// hiccup. Callers check this first, before falling back to their normal
// error state. Clears the stale auth store user *before* navigating — the
// global auth middleware only re-fetches the session when `!initialized`,
// so leaving a stale `user` set would otherwise bounce /login straight back
// to /admin (its own guest-redirect check).
export async function redirectIfUnauthenticated(error: unknown): Promise<boolean> {
  if (apiErrorStatus(error) !== 401) return false
  useAuthStore().user = null
  await navigateTo('/login')
  return true
}
