# Architecture Specification

## 1. High-Level Architecture

Single Nuxt application with:
- Nuxt/Vue frontend
- Nuxt Server/API backend
- MongoDB
- Redis

Conceptually:

Browser
→ Nuxt UI
→ Nuxt Server/API
→ MongoDB

and where useful:

Nuxt Server/API
→ Redis
→ MongoDB

## 2. Frontend

Stack:
- Nuxt
- Vue
- TypeScript
- Nuxt UI
- Tailwind
- Pinia selectively

### State strategy

Use local Vue state for:
- component-only UI state
- form state when not shared
- dialogs
- local selections

Use Pinia for genuinely shared state such as:
- authenticated user/session-derived state
- search/booking state only if it truly spans pages

Do not put everything into Pinia.

## 3. Backend

Use Nuxt Server/API.

Keep business logic readable and organized.

Possible conceptual areas:
- auth
- schedules
- availability
- appointments
- users
- booking

Do not create a huge service abstraction layer before it is needed.

## 4. Database

MongoDB is the persistent source of truth.

Initial conceptual entities:

### User
- id
- name
- email
- password hash
- timezone
- role
- createdAt
- updatedAt

### Schedule
- id
- ownerId
- name
- description
- durationMinutes
- location
- timezone
- bookingWindowDays
- minimumNoticeMinutes
- buffers if implemented
- status
- publicSlug
- createdAt
- updatedAt

### Availability
Can be embedded in Schedule or represented separately depending on the implementation.

Concept:
- weekday
- enabled
- timeRanges

### Booking Question
May be embedded in Schedule.

Concept:
- label
- type
- required
- order

### Appointment
- id
- scheduleId
- ownerId
- customer information
- startAt
- endAt
- timezone
- status
- answers
- confirmationCode
- createdAt
- updatedAt

Do not finalize schema complexity until implementation reveals the simplest correct model.

## 5. Indexing

Use indexes based on actual query patterns.

Likely important patterns:
- schedule public slug
- appointments by owner/date
- appointments by schedule/date
- unique identifiers such as email where appropriate

Do not add random indexes without a query reason.

## 6. Scheduling Engine

The scheduling engine conceptually:

1. load schedule
2. validate requested date
3. determine weekday
4. load availability rules
5. generate candidate slots using duration
6. apply booking window
7. apply minimum notice
8. remove conflicting appointments
9. apply buffers if implemented
10. return slots

The exact algorithm should be documented when implemented.

## 7. Double Booking

The system must re-check availability during booking creation.

A client could see:
10:00 available

Then another client books 10:00.

The first client must receive a safe conflict response rather than creating a duplicate booking.

Use an appropriate MongoDB strategy for the selected schema.

Do not rely on Redis locks as the only correctness mechanism.

## 8. Redis

Redis responsibilities:

### Availability caching
Cache computed availability for short periods.

Cache key should encode the relevant inputs, for example conceptually:
schedule + date + relevant configuration version

Use a short TTL.

### Rate limiting
Maintain request counters/window state for selected endpoints.

Redis is temporary state, not business truth.

## 9. Cache Invalidation

When a booking or cancellation changes availability:
- invalidate affected availability cache
- or use a versioning strategy

Correctness is more important than cache hit rate.

## 10. Redis Failure

Define graceful behavior.

If Redis is unavailable:
- business data remains in MongoDB
- availability can be computed directly
- caching may be bypassed
- rate limiting should fail according to the chosen security policy, documented in implementation

Never treat Redis failure as permission to accept a booking without database validation.

## 11. Authentication

Use HTTP-only cookie authentication.

Do not expose authentication secrets to JavaScript unnecessarily.

Protect admin endpoints with authentication middleware.

Check ownership/authorization at the server.

## 12. HTTP Concepts

The project should use standard HTTP semantics.

Examples:
- 200/201 success
- 400 invalid request
- 401 unauthenticated
- 403 authenticated but forbidden
- 404 resource not found
- 409 booking conflict
- 429 rate limited
- 500 unexpected server error

Exact responses should be chosen based on endpoint semantics.

## 13. Security

Server-side validation:
- validate body
- validate route params
- validate ownership
- validate booking time
- validate schedule state
- validate current availability

Never trust:
- hidden form values
- client-side calculated end times
- client-side availability
- client-provided owner IDs

## 14. CORS

Do not add CORS configuration unless the application architecture actually requires cross-origin requests.

If added, explain:
- origin
- why it is needed
- which origins are allowed
- credentials implications

## 15. SSR/CSR

Use Nuxt's rendering capabilities intentionally.

Public booking pages should be designed with performance and shareability in mind.

Interactive booking controls can use client-side reactivity.

Do not force every page into a purely client-rendered architecture without reason.

## 16. Future Scalability

The architecture should be understandable and capable of evolving, but this MVP is not a distributed system.

Do not optimize for imaginary scale before core correctness and UX.
