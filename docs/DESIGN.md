# Design & UX Specification

## 1. Design Goal

The application should look and feel like a real premium SaaS product, not a generic CRUD dashboard.

Frontend quality is the #1 priority.

The experience should be:
- polished
- calm
- clear
- modern
- responsive
- accessible
- friendly
- efficient

## 2. Visual Direction

Premium Modern SaaS.

Use:
- generous whitespace
- strong typography hierarchy
- restrained accents
- polished cards
- subtle borders/shadows
- meaningful iconography
- tasteful micro-interactions
- consistent spacing
- clear focus states

Avoid:
- visual clutter
- excessive gradients
- excessive glassmorphism
- huge decorative elements that hurt usability
- random colors
- overly dense dashboards
- generic template aesthetics

## 3. Design System First

Before building many pages, establish reusable primitives:
- typography
- page container
- headings
- buttons
- inputs
- selects
- cards
- badges
- tabs
- dialogs
- dropdowns
- alerts
- toast/notification pattern
- skeletons
- empty states
- error states

Use Nuxt UI where it provides the right primitive.

Use Tailwind for layout and styling.

Do not create custom components when an existing primitive already solves the need cleanly.

## 4. Layout

Desktop admin:
- persistent sidebar
- top header
- content area
- consistent max-width where appropriate

Mobile admin:
- compact header
- mobile navigation
- touch-friendly controls
- no horizontal overflow

Customer booking:
- distraction-free
- clear owner identity
- appointment information visible
- date/time selection prominent
- form progressive and easy to complete

## 5. Typography

Create clear levels:
- page title
- section title
- card title
- body
- secondary text
- caption
- form labels
- helper text
- error text

Never rely on color alone to communicate hierarchy.

## 6. Forms

Forms should:
- have clear labels
- show required/optional state
- show inline validation
- preserve entered values on recoverable errors
- disable submit while processing
- provide useful errors
- avoid unnecessary fields

Use progressive disclosure for complex schedule configuration.

## 7. Scheduling UI

Availability editing should feel intuitive.

Example:

Monday
[09:00 AM] → [05:00 PM]

+ Add time range

Wednesday
Unavailable

Support multiple ranges on a day when implemented:
09:00 → 12:00
14:00 → 17:00

Avoid making the admin manually enter every appointment slot.

## 8. Booking Page UX

Customer should understand immediately:
1. what they are booking
2. how long it takes
3. with whom
4. where it happens
5. which dates are available
6. which times are available

Do not force the customer through unnecessary screens.

The booking experience should be fast and reassuring.

## 9. Feedback

Use clear feedback for:
- save
- publish
- copy link
- loading
- validation
- errors
- booking success
- booking conflict

Avoid noisy notifications.

## 10. Animation

Use subtle animation only when it improves comprehension or perceived quality.

Examples:
- page transitions
- calendar/date selection
- card hover
- modal entrance
- loading transitions
- success state

Avoid animation that delays core interactions.

## 11. Accessibility

At minimum:
- keyboard-friendly controls
- visible focus
- semantic labels
- sufficient contrast
- accessible dialogs
- buttons with clear labels
- error messages associated with inputs
- do not use color as the only status signal

## 12. Mobile

Mobile is a first-class experience.

Pay special attention to:
- date picker
- time-slot buttons
- schedule editor
- sidebar/navigation
- dialogs
- forms
- confirmation page

Touch targets must be comfortable.

## 13. Design Rule

If a feature can be removed without harming the core booking journey, consider removing it before sacrificing UX quality.
