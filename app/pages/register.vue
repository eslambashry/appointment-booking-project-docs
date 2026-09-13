<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

useHead({
  title: 'Create your account — Schedulo'
})

const schema = z.object({
  name: z.string().min(1, 'Enter your name'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords don\'t match',
  path: ['confirmPassword']
})

type Schema = z.output<typeof schema>

const auth = useAuthStore()
const loading = ref(false)
const toast = useToast()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await auth.register(event.data)
    toast.add({
      title: 'Account created',
      description: 'Taking you to your dashboard…',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    await navigateTo('/admin/dashboard')
  } catch (error) {
    const status = apiErrorStatus(error)
    toast.add({
      title: status === 409 ? 'An account with this email already exists' : apiErrorMessage(error, 'Could not create your account.'),
      description: status === 409 ? 'Log in instead, or use a different email address.' : undefined,
      color: 'error',
      icon: 'i-lucide-circle-x'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <UAuthForm
      :schema="schema"
      icon="i-lucide-calendar-check-2"
      title="Create your account"
      description="Start accepting bookings in a couple of minutes."
      :fields="[
        { name: 'name', type: 'text', label: 'Name', placeholder: 'Alex Rivera', required: true },
        { name: 'email', type: 'text', label: 'Email', placeholder: 'you@example.com', required: true },
        { name: 'password', type: 'password', label: 'Password', placeholder: '••••••••', required: true, hint: 'At least 8 characters' },
        { name: 'confirmPassword', type: 'password', label: 'Confirm password', placeholder: '••••••••', required: true }
      ]"
      :submit="{ label: 'Create account' }"
      :loading="loading"
      @submit="onSubmit"
    >
      <template #footer>
        <p class="text-center text-sm text-muted">
          Already have an account?
          <ULink to="/login" class="font-medium text-primary">Log in</ULink>
        </p>
      </template>
    </UAuthForm>
  </UCard>
</template>
