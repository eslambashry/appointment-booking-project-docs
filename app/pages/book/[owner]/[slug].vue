<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { CalendarDate, type DateValue } from '@internationalized/date'
import { LOCATION_TYPE_LABELS, type Weekday } from '~/utils/mock-schedules'
import {
  fetchPublicSchedule,
  fetchAvailability,
  submitBooking,
  type PublicSchedule
} from '~/utils/public-booking'

definePageMeta({ layout: 'booking' })

const route = useRoute()
const toast = useToast()
const ownerSlug = route.params.owner as string
const scheduleSlug = route.params.slug as string

const JS_DAY_TO_WEEKDAY: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function toDateParam(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

const loading = ref(true)
const schedule = ref<PublicSchedule | null>(null)

// Day-of-week + booking window only (ignores minimum notice/existing
// conflicts) — a cheap way to enumerate candidate dates worth checking, not
// a claim that any of them is actually bookable.
function* candidateDates(target: PublicSchedule, now: Date): Generator<Date> {
  const today = startOfDay(now)
  for (let i = 0; i <= target.bookingWindowDays; i++) {
    const candidate = new Date(today)
    candidate.setDate(candidate.getDate() + i)
    const weekday = JS_DAY_TO_WEEKDAY[candidate.getDay()]!
    if (target.availability.find((d) => d.day === weekday)?.enabled) yield candidate
  }
}

const MAX_INITIAL_DATE_ATTEMPTS = 10

// A weekday being "open" doesn't mean it has any slots left — minimum notice
// alone can rule out every remaining slot today. Landing the customer on a
// date that immediately shows "No times available" is a weak first
// impression for the most important page in the product (DESIGN.md §5.6),
// so this checks a bounded number of real candidate dates and lands on the
// first one that genuinely has openings — falling back to the first
// candidate tried if none of them do, so the page still lands somewhere
// reasonable (and explains itself via the normal empty state) rather than
// nowhere.
async function findFirstDateWithOpenings(target: PublicSchedule, now: Date): Promise<Date | null> {
  let fallback: Date | null = null
  let attempts = 0
  for (const candidate of candidateDates(target, now)) {
    if (attempts >= MAX_INITIAL_DATE_ATTEMPTS) break
    attempts++
    fallback ??= candidate
    try {
      // Deliberately sequential — stop at the first date with real openings
      // instead of firing every attempt at once.
      const response = await fetchAvailability(ownerSlug, scheduleSlug, toDateParam(candidate))
      if (response.slots.length > 0) return candidate
    } catch {
      // try the next candidate
    }
  }
  return fallback
}

onMounted(async () => {
  try {
    schedule.value = await fetchPublicSchedule(ownerSlug, scheduleSlug)
  } catch {
    schedule.value = null
  }
  if (schedule.value) {
    const landingDate = await findFirstDateWithOpenings(schedule.value, new Date())
    if (landingDate) selectedCalendarDate.value = toCalendarDate(landingDate)
  }
  loading.value = false
})

useHead(() => ({
  title: schedule.value ? `Book ${schedule.value.name} — ${schedule.value.owner.name}` : 'Book an appointment'
}))

const locationIcon: Record<PublicSchedule['locationType'], string> = {
  in_person: 'i-lucide-map-pin',
  phone: 'i-lucide-phone',
  video: 'i-lucide-video',
  custom: 'i-lucide-link'
}

const customerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

function toCalendarDate(date: Date): CalendarDate {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}
function fromCalendarDate(value: DateValue): Date {
  return new Date(value.year, value.month - 1, value.day)
}

const today = new Date()
// shallowRef: CalendarDate is an immutable value object (private fields) that gets
// replaced wholesale on each selection, never mutated — deep ref unwrapping both
// serves no purpose here and erodes the class's TS type through Vue's UnwrapRef.
const selectedCalendarDate = shallowRef<CalendarDate | undefined>(undefined)
const selectedDate = computed(() => selectedCalendarDate.value ? fromCalendarDate(selectedCalendarDate.value) : null)
const selectedSlot = ref<Date | null>(null)

const slotsLoading = ref(false)
const slotsError = ref(false)
const availableSlots = ref<Date[]>([])

async function loadSlotsForSelectedDate() {
  if (!schedule.value || !selectedDate.value) {
    availableSlots.value = []
    return
  }
  slotsLoading.value = true
  slotsError.value = false
  try {
    const response = await fetchAvailability(ownerSlug, scheduleSlug, toDateParam(selectedDate.value))
    availableSlots.value = response.slots.map((iso) => new Date(iso))
  } catch {
    slotsError.value = true
    availableSlots.value = []
  } finally {
    slotsLoading.value = false
  }
}

watch(selectedDate, () => {
  selectedSlot.value = null
  loadSlotsForSelectedDate()
})

// Only the day-of-week + booking-window bounds are checked here (a display
// hint) — the server is always the final word on whether a given date/time
// is actually bookable (CLAUDE.md §9).
function isDateSelectable(value: DateValue): boolean {
  if (!schedule.value) return false
  const date = fromCalendarDate(value)
  const weekday = JS_DAY_TO_WEEKDAY[date.getDay()]!
  return !!schedule.value.availability.find((d) => d.day === weekday)?.enabled
}

const minCalendarDate = computed(() => toCalendarDate(today))
const maxCalendarDate = computed(() => {
  if (!schedule.value) return undefined
  const max = new Date(today)
  max.setDate(max.getDate() + schedule.value.bookingWindowDays)
  return toCalendarDate(max)
})

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function formatSelectedDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function selectSlot(slot: Date) {
  selectedSlot.value = slot
}

type BookingStep = 'datetime' | 'details' | 'review' | 'confirmed'
const step = ref<BookingStep>('datetime')
const stepNumber: Record<Exclude<BookingStep, 'confirmed'>, number> = { datetime: 1, details: 2, review: 3 }

function goToDetails() {
  if (!selectedSlot.value) return
  step.value = 'details'
}
function backToDatetime() {
  step.value = 'datetime'
}
function backToDetails() {
  step.value = 'details'
}

// Flat keys (including one per custom question, keyed by question id) — avoids
// nested-path schema/state wiring for what is otherwise a simple, small form.
const detailsState = reactive<Record<string, string>>({ name: '', email: '', phone: '' })

watch(schedule, (value) => {
  if (!value) return
  for (const question of value.questions) {
    if (!(question.id in detailsState)) detailsState[question.id] = ''
  }
}, { immediate: true })

const detailsSchema = computed(() => {
  const shape: Record<string, z.ZodTypeAny> = {
    name: z.string().min(1, 'Enter your name'),
    email: z.string().email('Enter a valid email address'),
    phone: schedule.value?.collectPhone
      ? z.string().min(1, 'Enter your phone number')
      : z.string().optional()
  }
  for (const question of schedule.value?.questions ?? []) {
    shape[question.id] = question.required
      ? z.string().min(1, 'This field is required')
      : z.string().optional()
  }
  return z.object(shape)
})

function goToReview(_event: FormSubmitEvent<Record<string, unknown>>) {
  step.value = 'review'
}

const submitting = ref(false)
const conflict = ref(false)
const confirmationCode = ref('')

async function confirmBooking() {
  if (!schedule.value || !selectedDate.value || !selectedSlot.value) return
  submitting.value = true
  conflict.value = false

  try {
    const confirmation = await submitBooking(ownerSlug, scheduleSlug, {
      startAt: selectedSlot.value.toISOString(),
      customerName: detailsState.name ?? '',
      customerEmail: detailsState.email ?? '',
      customerPhone: schedule.value.collectPhone ? detailsState.phone : undefined,
      answers: schedule.value.questions.map((q) => ({ questionId: q.id, answer: detailsState[q.id] ?? '' }))
    })
    confirmationCode.value = confirmation.confirmationCode
    step.value = 'confirmed'
  } catch (error) {
    if (apiErrorStatus(error) === 409) {
      conflict.value = true
    } else {
      toast.add({
        title: apiErrorMessage(error, 'Could not complete your booking.'),
        color: 'error',
        icon: 'i-lucide-circle-x'
      })
    }
  } finally {
    submitting.value = false
  }
}

function chooseAnotherTime() {
  conflict.value = false
  selectedSlot.value = null
  step.value = 'datetime'
  loadSlotsForSelectedDate()
}
</script>

<template>
  <UContainer class="max-w-3xl">
    <div v-if="loading" class="pt-10 space-y-6">
      <div class="flex items-center gap-3">
        <USkeleton class="size-12 rounded-full" />
        <div class="space-y-2">
          <USkeleton class="h-4 w-32" />
          <USkeleton class="h-3 w-24" />
        </div>
      </div>
      <USkeleton class="h-8 w-2/3" />
      <USkeleton class="h-20 w-full" />
      <USkeleton class="h-72 w-full" />
    </div>

    <div v-else-if="!schedule" class="pt-10">
      <UCard>
        <UEmpty
          icon="i-lucide-calendar-off"
          title="This booking page isn't available"
          description="The link may be incorrect, or the schedule owner has taken it offline."
        />
      </UCard>
    </div>

    <!-- Confirmed -->
    <div v-else-if="step === 'confirmed'" class="pt-16 pb-16">
      <div class="max-w-lg mx-auto text-center">
        <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
          <UIcon name="i-lucide-check" class="size-7" />
        </div>
        <h1 class="mt-5 text-xl font-semibold text-highlighted">You're booked!</h1>
        <p class="mt-2 text-sm text-muted">A confirmation has been sent to {{ detailsState.email }}.</p>

        <UCard class="mt-6 text-left">
          <dl class="space-y-2 text-sm">
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted">Appointment</dt>
              <dd class="text-highlighted font-medium">{{ schedule.name }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted">With</dt>
              <dd class="text-highlighted">{{ schedule.owner.name }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted">Date &amp; time</dt>
              <dd class="text-highlighted">{{ formatSelectedDate(selectedDate!) }} at {{ formatTime(selectedSlot!) }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted">Timezone</dt>
              <dd class="text-highlighted">{{ customerTimezone }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-muted">Location</dt>
              <dd class="text-highlighted">{{ LOCATION_TYPE_LABELS[schedule.locationType] }}</dd>
            </div>
          </dl>
          <template #footer>
            <div class="mt-4 text-sm text-muted">
              <p>Confirmation code</p>
              <p class="font-mono font-medium text-highlighted">{{ confirmationCode }}</p>
            </div>
            <div class="mt-4 text-lg text-black font-medium">
              <p>Waiting for an email that arrives in the day of your appointment.</p>
            </div>
          </template>
        </UCard>
      </div>
    </div>

    <div v-else class="pt-8 pb-16 space-y-8">
      <!-- Identity + appointment info -->
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <UAvatar :alt="schedule.owner.name" size="lg" />
          <div>
            <p class="text-sm text-muted">{{ schedule.owner.name }}</p>
            <p class="text-xs text-dimmed">{{ schedule.owner.bio }}</p>
          </div>
        </div>

        <h1 class="text-2xl sm:text-3xl font-semibold text-highlighted tracking-tight">{{ schedule.name }}</h1>
        <p v-if="schedule.description" class="text-muted max-w-xl">{{ schedule.description }}</p>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          <span class="inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-clock" class="size-4" />
            {{ schedule.durationMinutes }} minutes
          </span>
          <span class="inline-flex items-center gap-1.5">
            <UIcon :name="locationIcon[schedule.locationType]" class="size-4" />
            {{ LOCATION_TYPE_LABELS[schedule.locationType] }}
          </span>
        </div>
      </div>

      <div class="space-y-1.5">
        <p class="text-xs text-dimmed">Step {{ stepNumber[step] }} of 3</p>
        <UProgress :model-value="stepNumber[step]" :max="3" size="sm" />
      </div>

      <USeparator />

      <!-- Step 1: date & time -->
      <template v-if="step === 'datetime'">
        <div class="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-8">
          <div class="space-y-4">
            <h2 class="text-base font-medium text-highlighted">Select a date</h2>
            <UCalendar
              v-model="selectedCalendarDate"
              :is-date-disabled="(d: DateValue) => !isDateSelectable(d)"
              :min-value="minCalendarDate"
              :max-value="maxCalendarDate"
              class="w-full"
            />
            <p class="text-xs text-dimmed flex items-center gap-1.5">
              <UIcon name="i-lucide-globe" class="size-3.5" />
              Times shown in your timezone ({{ customerTimezone }})
            </p>
          </div>

          <div class="space-y-3">
            <h2 class="text-base font-medium text-highlighted">
              {{ selectedDate ? formatSelectedDate(selectedDate) : 'Available times' }}
            </h2>

            <div v-if="slotsLoading" class="space-y-2">
              <USkeleton v-for="i in 5" :key="i" class="h-10 w-full" />
            </div>

            <UEmpty
              v-else-if="slotsError"
              icon="i-lucide-circle-alert"
              title="Couldn't load times"
              description="Please try again."
              :actions="[{ label: 'Try again', color: 'primary', icon: 'i-lucide-refresh-cw', onClick: loadSlotsForSelectedDate }]"
              :ui="{ root: 'py-8' }"
            />

            <UEmpty
              v-else-if="availableSlots.length === 0"
              icon="i-lucide-calendar-x"
              title="No times available"
              description="Pick another date to see open times."
              :ui="{ root: 'py-8' }"
            />

            <div v-else class="grid grid-cols-2 lg:grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-1">
              <UButton
                v-for="slot in availableSlots"
                :key="slot.toISOString()"
                :color="selectedSlot?.getTime() === slot.getTime() ? 'primary' : 'neutral'"
                :variant="selectedSlot?.getTime() === slot.getTime() ? 'solid' : 'outline'"
                block
                @click="selectSlot(slot)"
              >
                {{ formatTime(slot) }}
              </UButton>
            </div>

            <UCard v-if="selectedSlot" class="bg-primary/5">
              <p class="text-sm font-medium text-highlighted">You selected</p>
              <p class="text-sm text-muted mt-0.5">
                {{ formatSelectedDate(selectedDate!) }} at {{ formatTime(selectedSlot) }}
              </p>
            </UCard>
          </div>
        </div>

        <div class="flex justify-end">
          <UButton :disabled="!selectedSlot" trailing-icon="i-lucide-arrow-right" @click="goToDetails">
            Continue
          </UButton>
        </div>
      </template>

      <!-- Steps 2 & 3 share a compact summary of the chosen slot -->
      <template v-else>
        <UCard variant="subtle">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-highlighted">
                {{ formatSelectedDate(selectedDate!) }} at {{ formatTime(selectedSlot!) }}
              </p>
              <p class="text-sm text-muted">{{ schedule.name }} · {{ schedule.durationMinutes }} min</p>
            </div>
            <UButton size="sm" color="neutral" variant="ghost" @click="backToDatetime">Edit</UButton>
          </div>
        </UCard>

        <!-- Step 2: customer information -->
        <UForm v-if="step === 'details'" :state="detailsState" :schema="detailsSchema" class="space-y-4" @submit="goToReview">
          <UFormField label="Name" name="name" required>
            <UInput v-model="detailsState.name" placeholder="Your full name" class="w-full" />
          </UFormField>
          <UFormField label="Email" name="email" required>
            <UInput v-model="detailsState.email" type="email" placeholder="you@example.com" class="w-full" />
          </UFormField>
          <UFormField v-if="schedule.collectPhone" label="Phone number" name="phone" required>
            <UInput v-model="detailsState.phone" type="tel" placeholder="+1 555 555 5555" class="w-full" />
          </UFormField>
          <UFormField
            v-for="question in schedule.questions"
            :key="question.id"
            :label="question.label"
            :name="question.id"
            :required="question.required"
          >
            <UTextarea v-if="question.type === 'long'" v-model="detailsState[question.id]" :rows="3" class="w-full" />
            <UInput v-else v-model="detailsState[question.id]" class="w-full" />
          </UFormField>

          <div class="flex items-center justify-between pt-2">
            <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" @click="backToDatetime">Back</UButton>
            <UButton type="submit" trailing-icon="i-lucide-arrow-right">Review</UButton>
          </div>
        </UForm>

        <!-- Step 3: review & confirm -->
        <div v-else-if="step === 'review'" class="space-y-4">
          <UAlert
            v-if="conflict"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            title="This time was just booked by someone else"
            description="Another customer grabbed this slot moments ago. Pick a different time to continue."
            :actions="[{ label: 'Choose another time', color: 'error', onClick: chooseAnotherTime }]"
          />

          <UCard>
            <template #header>
              <p class="font-medium text-highlighted">Review your booking</p>
            </template>
            <dl class="space-y-2 text-sm">
              <div class="flex items-center justify-between gap-4">
                <dt class="text-muted">Appointment</dt>
                <dd class="text-highlighted font-medium">{{ schedule.name }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-muted">Date &amp; time</dt>
                <dd class="text-highlighted">{{ formatSelectedDate(selectedDate!) }} at {{ formatTime(selectedSlot!) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-muted">Timezone</dt>
                <dd class="text-highlighted">{{ customerTimezone }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-muted">Location</dt>
                <dd class="text-highlighted">{{ LOCATION_TYPE_LABELS[schedule.locationType] }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-muted">Name</dt>
                <dd class="text-highlighted">{{ detailsState.name }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-muted">Email</dt>
                <dd class="text-highlighted">{{ detailsState.email }}</dd>
              </div>
              <div v-if="schedule.collectPhone" class="flex items-center justify-between gap-4">
                <dt class="text-muted">Phone</dt>
                <dd class="text-highlighted">{{ detailsState.phone }}</dd>
              </div>
            </dl>

            <div v-if="schedule.questions.length" class="mt-4 space-y-3 border-t border-default pt-3">
              <div v-for="question in schedule.questions" :key="question.id">
                <p class="text-xs text-muted">{{ question.label }}</p>
                <p class="text-sm text-highlighted">{{ detailsState[question.id] || '—' }}</p>
              </div>
            </div>
          </UCard>

          <div class="flex items-center justify-between">
            <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" :disabled="submitting" @click="backToDetails">
              Back
            </UButton>
            <UButton icon="i-lucide-check" :loading="submitting" @click="confirmBooking">
              Confirm booking
            </UButton>
          </div>
        </div>
      </template>
    </div>
  </UContainer>
</template>
