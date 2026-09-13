# API Specification

This document describes the intended API behavior. Exact file paths and implementation details may evolve while preserving the contracts.

## 1. Conventions

JSON request/response bodies unless a route has a specific reason otherwise.

Authentication:
- HTTP-only cookie

Server validates all important business rules.

## 2. Auth

### POST /api/auth/register

Creates an admin account.

Request:
- name
- email
- password
- confirmPassword

Possible responses:
- 201 created
- 400 validation error
- 409 email already used

### POST /api/auth/login

Request:
- email
- password

Possible responses:
- 200 success
- 400 invalid input
- 401 invalid credentials
- 429 rate limited

Sets HTTP-only auth cookie on success.

### POST /api/auth/logout

Clears auth session/cookie.

### GET /api/auth/me

Returns current authenticated user.

Possible:
- 200
- 401

## 3. Schedules

All admin schedule-management routes require authentication and ownership checks.

### GET /api/schedules

Returns schedules belonging to the authenticated owner.

### POST /api/schedules

Creates a schedule.

Core request concepts:
- name
- description
- durationMinutes
- location
- timezone
- availability
- bookingWindowDays
- minimumNoticeMinutes
- questions
- status

### GET /api/schedules/:id

Returns one owned schedule.

### PATCH /api/schedules/:id

Updates an owned schedule.

### DELETE /api/schedules/:id

Only implement if needed. Prefer disable/archive behavior if deletion creates unnecessary complexity.

## 4. Public Schedule

Routes are scoped by both the owner's slug and the schedule's slug
(`/api/public/:ownerSlug/:scheduleSlug`), not a single `:slug` — `Schedule.slug`
is only unique per owner (two admins can each have a schedule named
`consultation-call`), matching the public booking URL shape already used by
the frontend (`/book/<owner-slug>/<schedule-slug>`, Task 011). Corrected here
during Task 018's implementation per CLAUDE.md §18 (documented deliberately,
not changed silently).

### GET /api/public/:ownerSlug/:scheduleSlug

Returns public-safe schedule information.

Do NOT return private admin information.

### GET /api/public/:ownerSlug/:scheduleSlug/availability?date=YYYY-MM-DD

Returns available slots for the requested date.

Server calculates availability.

Possible:
- 200
- 400 invalid date
- 404 schedule not found/not public
- 429 rate limited
- 503 only if an unavoidable dependency failure occurs

## 5. Booking

### POST /api/public/:ownerSlug/:scheduleSlug/book

(Same `:ownerSlug/:scheduleSlug` scoping as section 4 — see note there.)

Request concept:
- date
- startAt or slot identifier
- customer name
- customer email
- customer phone if used
- answers

Server must:
1. validate public schedule
2. validate requested date/time
3. validate booking window
4. validate minimum notice
5. validate duration
6. validate configured questions
7. re-check current availability
8. create appointment safely
9. invalidate affected availability cache
10. return confirmation

Possible:
- 201 success
- 400 invalid data
- 404 schedule not found
- 409 slot no longer available
- 429 rate limited
- 500 unexpected failure

## 6. Admin Appointments

### GET /api/appointments

Authenticated owner only.

Filters may include:
- status
- date range
- schedule
- search

### GET /api/appointments/:id

Authenticated owner and ownership required.

### POST/PATCH cancellation endpoint

Implement a clear cancellation contract if cancellation is included in MVP.

## 7. Calendar

Calendar UI can use appointment list APIs.

Do not create a separate calendar backend subsystem unless needed.

## 8. Security Rules

Every authenticated endpoint must verify:
- authenticated identity
- resource ownership

Every public booking endpoint must validate:
- public schedule status
- slot availability
- customer input
- booking constraints

Never trust the client to enforce business rules.

## 9. Error Shape

Prefer a consistent error shape.

Concept:

{
  "statusCode": 409,
  "message": "The selected time is no longer available.",
  "code": "SLOT_UNAVAILABLE"
}

Do not expose stack traces or internal database details.

Exact schema can be finalized during implementation.
