<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

useHead({
  title: 'Log in — Schedulo'
})

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password')
})

type Schema = z.output<typeof schema>

const auth = useAuthStore()
const loading = ref(false)
const toast = useToast()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await auth.login(event.data.email, event.data.password)
    toast.add({
      title: 'Welcome back',
      description: 'Taking you to your dashboard…',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    await navigateTo('/admin/dashboard')
  } catch (error) {
    toast.add({
      title: apiErrorMessage(error, 'Invalid email or password.'),
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
      title="Welcome back"
      description="Log in to manage your schedules and appointments."
      :fields="[
        { name: 'email', type: 'text', label: 'Email', placeholder: 'you@example.com', required: true },
        { name: 'password', type: 'password', label: 'Password', placeholder: '••••••••', required: true }
      ]"
      :submit="{ label: 'Log in' }"
      :loading="loading"
      @submit="onSubmit"
    >
      <template #footer>
        <p class="text-center text-sm text-muted">
          Don't have an account?
          <ULink to="/register" class="font-medium text-primary">Sign up</ULink>
        </p>
      </template>
    </UAuthForm>
  </UCard>
</template>
