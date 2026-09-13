# Appointment Booking MVP

## 1. Product Summary

A premium appointment-booking platform inspired by the general concept of Google Calendar Appointment Schedules.

The schedule owner creates a booking schedule, defines when they are available, publishes a public booking page, and manages appointments.

A customer opens the public page, selects a date and available time, submits their information, and confirms the appointment.

## 2. User Roles

### Admin / Schedule Owner

Private authenticated user.

Main responsibilities:
- manage schedules
- configure availability
- manage appointments
- manage booking page

### Customer

Public visitor.

Main responsibilities:
- choose appointment
- choose date
- choose time
- provide information
- confirm booking

Customer account is NOT required for MVP.

## 3. End-to-End Flow

### Admin

Register/Login
→ Dashboard
→ Create Schedule
→ Configure Basic Info
→ Configure Duration
→ Configure Availability
→ Configure Booking Rules
→ Configure Questions
→ Review
→ Publish
→ Share Booking Page
→ Manage Appointments

### Customer

Public Booking Page
→ Appointment Details
→ Choose Date
→ Choose Time
→ Customer Information
→ Review
→ Confirm
→ Confirmation

## 4. Admin Screens

### 4.1 Login
Fields:
- email
- password

States:
- loading
- validation error
- invalid credentials
- server error

### 4.2 Register
Fields:
- name
- email
- password
- confirm password

### 4.3 Dashboard

Show useful, lightweight information:
- today's appointment count
- upcoming appointment count
- active schedule count
- today's/upcoming appointments
- quick actions

Avoid fake or unnecessary analytics.

Quick actions:
- create schedule
- view calendar
- copy booking link

### 4.4 Calendar

Views can start with:
- month
- week
- day

Minimum MVP behavior:
- navigate dates
- go to today
- open appointment details

Do not require drag-and-drop scheduling.

### 4.5 Schedules List

Show:
- schedule name
- duration
- availability summary
- active/disabled status
- edit action
- booking link action

### 4.6 Create/Edit Schedule

Use a guided wizard or similarly clear progressive form.

Step A — Basic information:
- appointment name
- description
- location type
- location value if needed

Step B — Duration:
- 15 min
- 30 min
- 45 min
- 60 min
- custom duration if implemented

Step C — Availability:
- timezone
- weekly days
- one or more time ranges per day
- unavailable days

Step D — Booking rules:
- booking window
- minimum notice
- optional buffers

Step E — Questions:
- required name
- required email
- optional phone
- additional short/long text questions

Step F — Review:
show final configuration before publishing.

### 4.7 Booking Page Settings

Show/configure:
- public URL
- display name
- short bio
- avatar/profile image if implemented
- public/disabled state
- copy link
- open booking page

### 4.8 Appointments

List:
- customer
- appointment type
- date
- time
- status

Filters:
- all
- upcoming
- completed
- cancelled

Search can be included if simple.

### 4.9 Appointment Details

Show:
- appointment type
- customer name
- email
- phone if provided
- date
- time
- timezone
- status
- answers to questions

MVP action:
- cancel appointment if cancellation is implemented

### 4.10 Settings

Keep simple:
- name
- email
- timezone
- password/security actions

## 5. Customer Screens

### 5.1 Public Booking Page

Should feel like a polished consumer-facing product.

Show:
- schedule owner identity
- appointment name
- duration
- description
- location
- calendar/date picker
- available times

### 5.2 Date Selection

Only dates that can potentially produce bookable slots should be selectable.

Unavailable dates should be visibly disabled.

### 5.3 Time Selection

After selecting a date, show available slots.

The backend is the authority.

A slot that becomes unavailable must not be bookable even if an older UI state still shows it.

### 5.4 Customer Information

Fields:
- name
- email
- phone if configured/used
- custom questions

### 5.5 Review

Show:
- appointment type
- date
- time
- timezone
- location
- customer details
- question answers

### 5.6 Confirmation

Show:
- success
- appointment type
- date
- time
- location
- confirmation/reference code

## 6. Core Business Rules

1. Admin availability is rule-based.
2. Appointment duration determines slot length.
3. Past times cannot be booked.
4. Minimum notice prevents last-minute bookings inside the configured window.
5. Booking window limits how far into the future customers can book.
6. Existing appointments block conflicting slots.
7. Server-side validation is mandatory.
8. Frontend availability is advisory; backend availability is authoritative.
9. Booking creation must protect against double booking.
10. MongoDB is the persistent source of truth.
11. Redis is never the authority for whether a booking exists.
12. Relevant availability cache must be invalidated/refreshed after availability-changing events.

## 7. Availability Example

Configuration:

Monday:
09:00–12:00
14:00–17:00

Tuesday:
09:00–17:00

Wednesday:
Unavailable

Duration:
30 minutes

The system derives candidate slots from these ranges.

Existing appointments and booking rules then remove invalid slots.

## 8. Statuses

Appointment statuses:
- confirmed
- cancelled
- completed

Only statuses needed by the MVP should be implemented.

## 9. Responsive Requirement

Every customer and admin screen must work well on:
- desktop
- tablet
- mobile

Do not treat mobile as a compressed desktop layout.

## 10. UX States

Important UI states:
- initial
- loading
- skeleton/loading placeholder
- empty
- validation error
- server error
- disabled
- success
- booking conflict
- expired/unavailable slot

## 11. Out of Scope

See `.claude/CLAUDE.md` for the canonical cut list.
