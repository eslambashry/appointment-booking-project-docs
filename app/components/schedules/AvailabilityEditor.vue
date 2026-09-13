<script setup lang="ts">
import { WEEKDAYS, type DayAvailability, type Weekday } from '~/utils/mock-schedules'

const availability = defineModel<DayAvailability[]>('availability', { required: true })
const timezone = defineModel<string>('timezone', { required: true })
const valid = defineModel<boolean>('valid', { default: true })

const toast = useToast()

const timezoneItems = computed(() => {
  const zones = [
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'Europe/London',
    'Europe/Berlin',
    'Africa/Cairo',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Australia/Sydney'
  ]
  return zones.map((zone) => ({ label: formatTimezoneLabel(zone), value: zone }))
})

function formatTimezoneLabel(zone: string): string {
  const city = (zone.split('/')[1] ?? zone).replace(/_/g, ' ')
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value ?? ''
  return `${city} — ${offset}`
}

const currentTimeInZone = computed(() => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone.value,
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date())
  } catch {
    return null
  }
})

function dayLabel(day: Weekday): string {
  return WEEKDAYS.find((w) => w.value === day)?.label ?? day
}

function addRange(day: DayAvailability) {
  const last = day.ranges[day.ranges.length - 1]!
  const nextStart = addMinutes(last.end, 60)
  day.ranges.push({ start: nextStart, end: addMinutes(nextStart, 60) })
}

function removeRange(day: DayAvailability, index: number) {
  day.ranges.splice(index, 1)
}

function addMinutes(time: string, minutesToAdd: number): string {
  const [hoursPart, minutesPart] = time.split(':')
  const totalMinutes = (Number(hoursPart ?? 0) * 60 + Number(minutesPart ?? 0) + minutesToAdd) % (24 * 60)
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const minutes = (totalMinutes % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function copyToAllDays(sourceDay: Weekday) {
  const source = availability.value.find((d) => d.day === sourceDay)
  if (!source) return
  for (const day of availability.value) {
    if (day.day !== sourceDay && day.enabled) {
      day.ranges = source.ranges.map((range) => ({ ...range }))
    }
  }
  toast.add({ title: 'Copied to every active day', color: 'success', icon: 'i-lucide-check-circle' })
}

function dayError(day: DayAvailability): string | null {
  if (!day.enabled) return null
  for (const range of day.ranges) {
    if (!range.start || !range.end || range.start >= range.end) {
      return 'End time must be after start time'
    }
  }
  const sorted = [...day.ranges].sort((a, b) => a.start.localeCompare(b.start))
  let previousEnd: string | null = null
  for (const range of sorted) {
    if (previousEnd && range.start < previousEnd) {
      return 'Time ranges can\'t overlap'
    }
    previousEnd = range.end
  }
  return null
}

const hasAnyEnabledDay = computed(() => availability.value.some((d) => d.enabled))
const isValid = computed(() => hasAnyEnabledDay.value && availability.value.every((d) => !dayError(d)))

watch(isValid, (value) => { valid.value = value }, { immediate: true })
</script>

<template>
  <div class="space-y-5">
    <UFormField label="Timezone">
      <USelect v-model="timezone" :items="timezoneItems" class="w-full sm:w-80" />
    </UFormField>
    <p v-if="currentTimeInZone" class="text-sm text-muted -mt-3">
      It's currently <span class="font-medium text-highlighted">{{ currentTimeInZone }}</span> for customers booking in this timezone.
    </p>

    <div class="divide-y divide-default rounded-lg border border-default">
      <div v-for="day in availability" :key="day.day" class="p-3 sm:p-4 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <USwitch v-model="day.enabled" :aria-label="`Toggle ${dayLabel(day.day)}`" />
            <span class="text-sm font-medium text-highlighted w-24">{{ dayLabel(day.day) }}</span>
          </div>
          <UButton
            v-if="day.enabled"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-copy"
            @click="copyToAllDays(day.day)"
          >
            Copy to all
          </UButton>
          <span v-else class="text-sm text-muted">Unavailable</span>
        </div>

        <div v-if="day.enabled" class="space-y-2 sm:pl-9">
          <div v-for="(range, index) in day.ranges" :key="index" class="flex items-center gap-2">
            <UInput v-model="range.start" type="time" />
            <span class="text-sm text-muted">to</span>
            <UInput v-model="range.end" type="time" />
            <UButton
              v-if="day.ranges.length > 1"
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Remove time range"
              @click="removeRange(day, index)"
            />
          </div>
          <UButton icon="i-lucide-plus" color="neutral" variant="link" size="xs" class="p-0" @click="addRange(day)">
            Add time range
          </UButton>
          <p v-if="dayError(day)" class="text-sm text-error flex items-center gap-1.5">
            <UIcon name="i-lucide-circle-alert" class="size-3.5" />
            {{ dayError(day) }}
          </p>
        </div>
      </div>
    </div>

    <p v-if="!hasAnyEnabledDay" class="text-sm text-error flex items-center gap-1.5">
      <UIcon name="i-lucide-circle-alert" class="size-4" />
      Turn on at least one day to accept bookings.
    </p>
  </div>
</template>
