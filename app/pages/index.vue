<script setup lang="ts">
useHead({
  title: 'Schedulo — Booking pages that run themselves'
})

const steps = [
  {
    icon: 'i-lucide-calendar-cog',
    title: '1. Set your availability',
    description: 'Define when you work, your appointment length, timezone, and booking rules once — Schedulo turns it into bookable time automatically.'
  },
  {
    icon: 'i-lucide-share-2',
    title: '2. Share your link',
    description: 'Publish a booking page and share one link. No back-and-forth emails to find a time that works.'
  },
  {
    icon: 'i-lucide-check-check',
    title: '3. Get booked',
    description: 'Customers pick an open time and confirm instantly. You see it on your calendar the moment it happens.'
  }
]

const features = [
  {
    icon: 'i-lucide-calendar-clock',
    title: 'Rule-based availability',
    description: 'Set your weekly hours once. Schedulo works out every bookable slot for you — no manual slot creation.'
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Never double-booked',
    description: 'Every booking is re-checked the moment it’s made, so two customers can never land the same slot.'
  },
  {
    icon: 'i-lucide-globe',
    title: 'Timezone aware',
    description: 'Customers always see times in their own timezone — you never have to think about the conversion.'
  },
  {
    icon: 'i-lucide-list-checks',
    title: 'Custom questions',
    description: 'Collect exactly what you need before the call — phone number, project details, anything.'
  },
  {
    icon: 'i-lucide-badge-check',
    title: 'Instant confirmation',
    description: 'Customers get a clear confirmation and reference code the moment they book. No wondering if it worked.'
  },
  {
    icon: 'i-lucide-smartphone',
    title: 'Built for mobile',
    description: 'Booking, browsing, and managing appointments feel just as good on a phone as on a desktop.'
  }
]
</script>

<template>
  <div>
    <UPageHero
      headline="Appointment scheduling"
      title="Booking pages that book themselves"
      description="Set your availability once. Share a link. Let customers book the time that works — without a single email back and forth."
      :links="[
        { label: 'Get started — it’s free', to: '/register', size: 'lg', icon: 'i-lucide-arrow-right', trailing: true },
        { label: 'I already have an account', to: '/login', size: 'lg', color: 'neutral', variant: 'subtle' }
      ]"
    />

    <UPageSection
      id="how-it-works"
      headline="How it works"
      title="From empty calendar to booked appointment in three steps"
      :features="steps"
      orientation="horizontal"
    />

    <UPageSection
      id="features"
      headline="Why Schedulo"
      title="Everything a real schedule owner needs"
      description="Nothing you don't need. Every detail here exists because it removes a real scheduling headache."
      :features="features"
    />

    <UPageCTA
      title="Ready to stop the back-and-forth?"
      description="Create your first schedule in a couple of minutes — free, no credit card."
      variant="subtle"
      :links="[
        { label: 'Create your booking page', to: '/register', size: 'lg', icon: 'i-lucide-arrow-right', trailing: true }
      ]"
    />
  </div>
</template>
