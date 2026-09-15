<script setup lang="ts">
import {
  LOCATION_TYPE_LABELS,
  availabilitySummary,
  defaultAvailability,
  createSchedule,
  updateSchedule,
  type Schedule,
  type LocationType,
  type BookingQuestion
} from '~/utils/mock-schedules'
import AvailabilityEditor from './AvailabilityEditor.vue'

const props = defineProps<{
  mode: 'create' | 'edit'
  initial?: Schedule
}>()

const toast = useToast()
const auth = useAuthStore()

const form = reactive({
  name: props.initial?.name ?? '',
  description: props.initial?.description ?? '',
  locationType: props.initial?.locationType ?? 'video' as LocationType,
  locationValue: props.initial?.locationValue ?? '',
  durationMinutes: props.initial?.durationMinutes ?? 30,
  timezone: props.initial?.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'),
  // toRaw() first — a component prop is reactive (Vue wraps it in a Proxy),
  // and structuredClone() throws DataCloneError on a reactive Proxy. Only
  // reachable in edit mode (create mode has no `initial` prop, so this never
  // ran in Task 007's original testing) — found via a real browser test in
  // Task 024, invisible to this whole project's curl-based verification.
  availability: props.initial ? structuredClone(toRaw(props.initial.availability)) : defaultAvailability(),
  bookingWindowDays: props.initial?.bookingWindowDays ?? 30,
  minimumNoticeHours: props.initial?.minimumNoticeHours ?? 4,
  bufferBeforeMinutes: props.initial?.bufferBeforeMinutes ?? 0,
  bufferAfterMinutes: props.initial?.bufferAfterMinutes ?? 0,
  collectPhone: props.initial?.collectPhone ?? false,
  questions: props.initial ? structuredClone(toRaw(props.initial.questions)) : [] as BookingQuestion[],
  slug: props.initial?.slug ?? ''
})

const stepItems = [
  { title: 'Basic info', icon: 'i-lucide-file-text' },
  { title: 'Duration', icon: 'i-lucide-clock' },
  { title: 'Availability', icon: 'i-lucide-calendar-days' },
  { title: 'Booking rules', icon: 'i-lucide-shield-check' },
  { title: 'Questions', icon: 'i-lucide-list-checks' },
  { title: 'Review', icon: 'i-lucide-check-check' }
]
const currentStepIndex = ref(0)
const isFirstStep = computed(() => currentStepIndex.value === 0)
const isLastStep = computed(() => currentStepIndex.value === stepItems.length - 1)

const locationTypeItems: { label: string, value: LocationType }[] = [
  { label: 'In person', value: 'in_person' },
  { label: 'Phone call', value: 'phone' },
  { label: 'Video call', value: 'video' },
  { label: 'Custom', value: 'custom' }
]

const locationValueMeta = computed(() => {
  switch (form.locationType) {
    case 'in_person':
      return { label: 'Address', placeholder: '123 Market Street, Suite 400' }
    case 'phone':
      return { label: 'Phone number', placeholder: 'Number to call, or "Provided at booking"' }
    case 'video':
      return { label: 'Video call link', placeholder: 'e.g. "Link sent after booking"' }
    default:
      return { label: 'Location details', placeholder: 'Where or how this appointment happens' }
  }
})

const durationItems = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 }
]

const availabilityValid = ref(true)

const canProceed = computed(() => {
  if (currentStepIndex.value === 0) return form.name.trim().length > 0 && form.locationValue.trim().length > 0
  if (currentStepIndex.value === 2) return availabilityValid.value
  return true
})

function goNext() {
  if (canProceed.value && !isLastStep.value) currentStepIndex.value += 1
}
function goBack() {
  if (!isFirstStep.value) currentStepIndex.value -= 1
}
function jumpTo(index: number) {
  currentStepIndex.value = index
}

function addQuestion() {
  form.questions.push({ id: crypto.randomUUID(), label: '', type: 'short', required: false })
}
function removeQuestion(id: string) {
  form.questions = form.questions.filter((q) => q.id !== id)
}
const { public: { appUrl } } = useRuntimeConfig()
const submitting = ref(false)
const published = ref(false)
// Preview only, before the server assigns/normalizes the real slug — replaced
// by the saved schedule's actual slug once the request succeeds.
const savedSlug = ref('')
const publicUrl = computed(() => {
  const slug = savedSlug.value || form.slug || form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'my-schedule'
  return `${appUrl}/book/${auth.user?.slug}/${slug}`
})

async function handleSubmit() {
  submitting.value = true
  try {
    const payload = {
      name: form.name,
      description: form.description,
      locationType: form.locationType,
      locationValue: form.locationValue,
      durationMinutes: form.durationMinutes,
      timezone: form.timezone,
      availability: form.availability,
      bookingWindowDays: form.bookingWindowDays,
      minimumNoticeHours: form.minimumNoticeHours,
      bufferBeforeMinutes: form.bufferBeforeMinutes,
      bufferAfterMinutes: form.bufferAfterMinutes,
      collectPhone: form.collectPhone,
      // The server always assigns fresh question ids on save — the client-side
      // `id` here only exists so this form can key/edit rows locally.
      questions: form.questions.map((q) => ({ label: q.label, type: q.type, required: q.required })),
      slug: form.slug || undefined
    }

    // This wizard has no publish/disable control, so status is only ever set
    // on create (new schedules start active) — an edit save must never
    // silently flip a schedule an admin had disabled back to active by
    // omission, so status is simply left out of the update payload.
    const saved = props.mode === 'create'
      ? await createSchedule({ ...payload, status: 'active' })
      : await updateSchedule(props.initial!.id, payload)

    savedSlug.value = saved.slug
    published.value = true
    toast.add({
      title: props.mode === 'create' ? 'Schedule published' : 'Changes saved',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } catch (error) {
    if (await redirectIfUnauthenticated(error)) return
    toast.add({
      title: apiErrorMessage(error, props.mode === 'create' ? 'Could not create this schedule.' : 'Could not save your changes.'),
      color: 'error',
      icon: 'i-lucide-circle-x'
    })
  } finally {
    submitting.value = false
  }
}

const linkCopied = ref(false)
async function copyPublicUrl() {
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    linkCopied.value = true
    toast.add({ title: 'Link copied', color: 'success', icon: 'i-lucide-check-circle' })
    setTimeout(() => (linkCopied.value = false), 2000)
  } catch {
    toast.add({ title: 'Could not copy the link', color: 'error', icon: 'i-lucide-circle-x' })
  }
}
</script>

<template>
  <div v-if="published" class="max-w-lg mx-auto text-center py-12">
    <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
      <UIcon name="i-lucide-check" class="size-7" />
    </div>
    <h1 class="mt-5 text-xl font-semibold text-highlighted">
      {{ mode === 'create' ? 'Your schedule is live' : 'Changes saved' }}
    </h1>
    <p class="mt-2 text-sm text-muted">
      {{ mode === 'create'
        ? 'Share this link with customers so they can start booking.'
        : 'Your booking page reflects these changes immediately.' }}
    </p>

    <div class="mt-6 flex items-center gap-2 rounded-lg border border-default bg-muted/50 p-2 pl-4 text-left">
      <span class="flex-1 min-w-0 truncate text-sm text-highlighted">{{ publicUrl }}</span>
      <UButton
        :icon="linkCopied ? 'i-lucide-check' : 'i-lucide-copy'"
        color="neutral"
        variant="ghost"
        size="sm"
        :aria-label="'Copy booking link'"
        @click="copyPublicUrl"
      />
    </div>

    <div class="mt-6 flex flex-col sm:flex-row justify-center gap-3">
      <UButton :to="publicUrl" target="_blank" color="neutral" variant="subtle" icon="i-lucide-external-link">
        Open booking page
      </UButton>
      <UButton to="/admin/schedules" color="primary" icon="i-lucide-arrow-left">
        Back to schedules
      </UButton>
    </div>
  </div>

  <div v-else class="max-w-3xl mx-auto space-y-6">
    <!-- Desktop stepper -->
    <UStepper :items="stepItems" :model-value="currentStepIndex" disabled class="hidden sm:flex" />

    <!-- Mobile compact indicator -->
    <div class="sm:hidden space-y-2">
      <p class="text-sm font-medium text-highlighted">
        Step {{ currentStepIndex + 1 }} of {{ stepItems.length }} — {{ stepItems[currentStepIndex]?.title }}
      </p>
      <UProgress :model-value="currentStepIndex + 1" :max="stepItems.length" size="sm" />
    </div>

    <UCard>
      <!-- Step 0: Basic info -->
      <div v-if="currentStepIndex === 0" class="space-y-5">
        <UFormField label="Appointment name" required>
          <UInput v-model="form.name" placeholder="e.g. 30 Minute Meeting" class="w-full" autofocus />
        </UFormField>
        <UFormField label="Description" help="Shown to customers on your booking page">
          <UTextarea v-model="form.description" :rows="3" placeholder="What is this appointment for?" class="w-full" />
        </UFormField>
        <UFormField label="Location type">
          <URadioGroup
            v-model="form.locationType"
            :items="locationTypeItems"
            variant="card"
            indicator="hidden"
            orientation="horizontal"
            class="grid grid-cols-2 sm:grid-cols-4 gap-2"
          />
        </UFormField>
        <UFormField :label="locationValueMeta.label" required>
          <UInput v-model="form.locationValue" :placeholder="locationValueMeta.placeholder" class="w-full" />
        </UFormField>
      </div>

      <!-- Step 1: Duration -->
      <div v-else-if="currentStepIndex === 1" class="space-y-5">
        <UFormField label="How long is this appointment?">
          <URadioGroup
            v-model="form.durationMinutes"
            :items="durationItems"
            variant="card"
            indicator="hidden"
            orientation="horizontal"
            class="grid grid-cols-2 sm:grid-cols-4 gap-2"
          />
        </UFormField>
      </div>

      <!-- Step 2: Availability -->
      <div v-else-if="currentStepIndex === 2">
        <AvailabilityEditor
          v-model:availability="form.availability"
          v-model:timezone="form.timezone"
          v-model:valid="availabilityValid"
        />
      </div>

      <!-- Step 3: Booking rules -->
      <div v-else-if="currentStepIndex === 3" class="grid sm:grid-cols-2 gap-5">
        <UFormField label="Booking window" help="How far ahead customers can book">
          <div class="flex items-center gap-2">
            <UInputNumber v-model="form.bookingWindowDays" :min="1" :max="365" class="w-28" />
            <span class="text-sm text-muted">days</span>
          </div>
        </UFormField>
        <UFormField label="Minimum notice" help="Blocks last-minute bookings">
          <div class="flex items-center gap-2">
            <UInputNumber v-model="form.minimumNoticeHours" :min="0" :max="168" class="w-28" />
            <span class="text-sm text-muted">hours</span>
          </div>
        </UFormField>
        <UFormField label="Buffer before" help="Optional gap before each appointment">
          <div class="flex items-center gap-2">
            <UInputNumber v-model="form.bufferBeforeMinutes" :min="0" :max="120" :step="5" class="w-28" />
            <span class="text-sm text-muted">minutes</span>
          </div>
        </UFormField>
        <UFormField label="Buffer after" help="Optional gap after each appointment">
          <div class="flex items-center gap-2">
            <UInputNumber v-model="form.bufferAfterMinutes" :min="0" :max="120" :step="5" class="w-28" />
            <span class="text-sm text-muted">minutes</span>
          </div>
        </UFormField>
      </div>

      <!-- Step 4: Questions -->
      <div v-else-if="currentStepIndex === 4" class="space-y-5">
        <div>
          <p class="text-sm font-medium text-muted mb-2">Always collected</p>
          <div class="space-y-2">
            <div class="flex items-center justify-between rounded-lg border border-default bg-muted/50 px-3 py-2.5">
              <span class="text-sm text-highlighted">Name</span>
              <UBadge color="neutral" variant="subtle" size="sm">Required</UBadge>
            </div>
            <div class="flex items-center justify-between rounded-lg border border-default bg-muted/50 px-3 py-2.5">
              <span class="text-sm text-highlighted">Email</span>
              <UBadge color="neutral" variant="subtle" size="sm">Required</UBadge>
            </div>
            <div class="flex items-center justify-between rounded-lg border border-default px-3 py-2.5">
              <span class="text-sm text-highlighted">Phone number</span>
              <USwitch v-model="form.collectPhone" aria-label="Collect phone number" />
            </div>
          </div>
        </div>

        <div>
          <p class="text-sm font-medium text-muted mb-2">Custom questions</p>
          <div v-if="form.questions.length === 0" class="rounded-lg border border-dashed border-default p-4 text-sm text-muted">
            No custom questions yet — add one if you need more information before the appointment.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="question in form.questions"
              :key="question.id"
              class="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-default p-3"
            >
              <UInput v-model="question.label" placeholder="Question label" class="flex-1 w-full" />
              <USelect
                v-model="question.type"
                :items="[{ label: 'Short answer', value: 'short' }, { label: 'Long answer', value: 'long' }]"
                class="w-full sm:w-40"
              />
              <div class="flex items-center gap-3 shrink-0">
                <label class="flex items-center gap-1.5 text-sm text-muted">
                  <USwitch v-model="question.required" size="sm" />
                  Required
                </label>
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove question"
                  @click="removeQuestion(question.id)"
                />
              </div>
            </div>
          </div>
          <UButton icon="i-lucide-plus" color="neutral" variant="subtle" size="sm" class="mt-3" @click="addQuestion">
            Add question
          </UButton>
        </div>
      </div>

      <!-- Step 5: Review -->
      <div v-else class="space-y-4">
        <div class="flex items-start justify-between gap-3 rounded-lg border border-default p-3">
          <div class="min-w-0">
            <p class="text-sm font-medium text-highlighted">{{ form.name || 'Untitled schedule' }}</p>
            <p class="text-sm text-muted mt-0.5">{{ form.description || 'No description' }}</p>
            <p class="text-sm text-muted mt-1">{{ LOCATION_TYPE_LABELS[form.locationType] }} · {{ form.locationValue }}</p>
          </div>
          <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" aria-label="Edit basic info" @click="jumpTo(0)" />
        </div>

        <div class="flex items-start justify-between gap-3 rounded-lg border border-default p-3">
          <p class="text-sm text-highlighted">{{ form.durationMinutes }} minutes</p>
          <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" aria-label="Edit duration" @click="jumpTo(1)" />
        </div>

        <div class="flex items-start justify-between gap-3 rounded-lg border border-default p-3">
          <div>
            <p class="text-sm text-highlighted">{{ availabilitySummary(form.availability) }}</p>
            <p class="text-sm text-muted mt-0.5">{{ form.timezone }}</p>
          </div>
          <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" aria-label="Edit availability" @click="jumpTo(2)" />
        </div>

        <div class="flex items-start justify-between gap-3 rounded-lg border border-default p-3">
          <p class="text-sm text-highlighted">
            {{ form.bookingWindowDays }}-day window · {{ form.minimumNoticeHours }}h notice
            <template v-if="form.bufferBeforeMinutes || form.bufferAfterMinutes">
              · {{ form.bufferBeforeMinutes }}m/{{ form.bufferAfterMinutes }}m buffer
            </template>
          </p>
          <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" aria-label="Edit booking rules" @click="jumpTo(3)" />
        </div>

        <div class="flex items-start justify-between gap-3 rounded-lg border border-default p-3">
          <p class="text-sm text-highlighted">
            Name, Email{{ form.collectPhone ? ', Phone' : '' }}{{ form.questions.length ? ` + ${form.questions.length} custom` : '' }}
          </p>
          <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" aria-label="Edit questions" @click="jumpTo(4)" />
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between">
          <UButton
            v-if="!isFirstStep"
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            @click="goBack"
          >
            Back
          </UButton>
          <div v-else />

          <UButton
            v-if="!isLastStep"
            color="primary"
            trailing-icon="i-lucide-arrow-right"
            :disabled="!canProceed"
            @click="goNext"
          >
            Continue
          </UButton>
          <UButton
            v-else
            color="primary"
            :icon="mode === 'create' ? 'i-lucide-rocket' : 'i-lucide-check'"
            :loading="submitting"
            @click="handleSubmit"
          >
            {{ mode === 'create' ? 'Publish schedule' : 'Save changes' }}
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>
