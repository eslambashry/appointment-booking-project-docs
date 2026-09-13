import { z } from 'zod'

// Mirrors app/pages/register.vue's own schema exactly (name/email/password/
// confirmPassword, 8-char minimum) — the server enforces the same contract
// the UI already promises, never a surprise superset.
export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Must be at least 8 characters').max(200),
  confirmPassword: z.string().min(1, 'Confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords don\'t match',
  path: ['confirmPassword']
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password')
})
