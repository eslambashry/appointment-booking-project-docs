import type { HydratedDocument } from 'mongoose'
import type { AppointmentDocument } from '../models/Appointment'
import type { ScheduleDocument } from '../models/Schedule'

interface ReminderAppointment {
  appointment: HydratedDocument<AppointmentDocument>
  schedule: HydratedDocument<ScheduleDocument>
}

// The app's actual primary color (app/app.config.ts: ui.colors.primary =
// 'teal') and the rest of a small palette derived from it — email clients
// don't load an external stylesheet or read CSS variables, so every color
// here has to be a literal hex inlined per element.
const BRAND = '#00BBA7'
const BRAND_DARK = '#0F766E' // accessible text-on-tint color (BRAND itself is too light for small text)
const INK = '#111827'
const MUTED = '#6B7280'
const BORDER = '#E5E7EB'
const TINT = '#ECFDF9'
const CANVAS = '#F4F5F7'

const LOCATION_LABEL: Record<ScheduleDocument['locationType'], string> = {
  in_person: 'In person',
  phone: 'Phone call',
  video: 'Video call',
  custom: 'Location'
}

// Formatted directly in the schedule's own stored timezone — for an email
// there's no "browser" to fall back on the way the frontend does (see
// scheduling-engine.ts's timezone comment), so this is the one place that
// actually converts into the schedule's IANA zone via Intl, not just
// wall-clock arithmetic.
function formatWhen(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

function locationLine(schedule: ScheduleDocument): string {
  return `${LOCATION_LABEL[schedule.locationType]}: ${schedule.locationValue}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Table-based layout, every style inlined — the only markup subset that
// renders consistently across real inboxes (Gmail strips <style> blocks in
// some views, Outlook uses Word's HTML engine). `previewText` is the
// snippet Gmail/Apple Mail show next to the subject in the inbox list;
// it's rendered hidden in the body since email has no <head><meta> for it.
function emailShell(previewText: string, bodyHtml: string): string {
  // runtimeConfig().public.appUrl (nuxt.config.ts) is the deployed site's
  // real origin in production — email clients fetch images over the open
  // internet, so this has to be an absolute URL, never a relative one. In
  // local dev it resolves to localhost, which a real inbox can't reach; the
  // alt text + tinted background below keep the header from looking broken
  // when that happens.
  const { appUrl } = useRuntimeConfig().public
  const logoUrl = `${appUrl.replace(/\/$/, '')}/logo-transparent.png`

  return `
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(previewText)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CANVAS};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
        <tr>
          <td style="padding:28px 32px 20px 32px;border-bottom:1px solid ${BORDER};">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color:${TINT};border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                  <img src="${logoUrl}" width="22" height="22" alt="Schedulo" style="display:block;margin:7px auto;" />
                </td>
                <td style="padding-left:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:17px;font-weight:700;color:${INK};">
                  Schedulo
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background-color:${CANVAS};text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:${MUTED};">
            Sent by Schedulo — appointment scheduling made simple.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`
}

function todayBadge(): string {
  return `<span style="display:inline-block;background-color:${BRAND};color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.03em;padding:4px 10px;border-radius:999px;">TODAY</span>`
}

function detailRow(label: string, value: string, isLast = false): string {
  return `
    <tr>
      <td style="padding:12px 0;${isLast ? '' : `border-bottom:1px solid ${BORDER};`}font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top;width:96px;">${escapeHtml(label)}</td>
      <td style="padding:12px 0;${isLast ? '' : `border-bottom:1px solid ${BORDER};`}font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:${INK};">${value}</td>
    </tr>
  `
}

export function buildCustomerReminderEmail(
  { appointment, schedule }: ReminderAppointment,
  ownerName: string
): { subject: string; html: string; text: string } {
  const when = formatWhen(appointment.startAt, appointment.timezone)
  const subject = `Reminder: your appointment today with ${ownerName}`

  const text = [
    `Hi ${appointment.customerName},`,
    '',
    `This is a reminder that you have an appointment today.`,
    '',
    `${schedule.name}`,
    when,
    locationLine(schedule),
    `Confirmation code: ${appointment.confirmationCode}`,
    '',
    `If you need to make changes, please contact ${ownerName} directly.`
  ].join('\n')

  const body = `
    <p style="margin:0 0 4px 0;font-size:15px;">Hi ${escapeHtml(appointment.customerName)},</p>
    <h1 style="margin:12px 0 20px 0;font-size:22px;line-height:1.3;font-weight:700;color:${INK};">
      You have an appointment ${todayBadge()}
    </h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CANVAS};border-radius:12px;padding:4px 20px;margin-bottom:20px;">
      ${detailRow('What', escapeHtml(schedule.name))}
      ${detailRow('When', escapeHtml(when))}
      ${detailRow('Where', escapeHtml(locationLine(schedule)))}
      ${detailRow('Confirmation', `<span style="display:inline-block;background-color:${TINT};color:${BRAND_DARK};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;font-weight:700;padding:3px 8px;border-radius:6px;letter-spacing:0.02em;">${escapeHtml(appointment.confirmationCode)}</span>`, true)}
    </table>
    <p style="margin:0;font-size:14px;color:${MUTED};line-height:1.6;">
      Need to make a change? Contact <strong style="color:${INK};">${escapeHtml(ownerName)}</strong> directly.
    </p>
  `

  return { subject, html: emailShell(`Reminder: ${schedule.name} today at ${when}`, body), text }
}

export function buildAdminDigestEmail(
  ownerName: string,
  items: ReminderAppointment[]
): { subject: string; html: string; text: string } {
  const count = items.length
  const subject = count === 1
    ? 'You have 1 appointment today'
    : `You have ${count} appointments today`

  const sorted = [...items].sort((a, b) => a.appointment.startAt.getTime() - b.appointment.startAt.getTime())

  const textLines = sorted.map(({ appointment, schedule }) =>
    `- ${formatWhen(appointment.startAt, appointment.timezone)} — ${appointment.customerName} (${schedule.name})`)

  const text = [
    `Hi ${ownerName},`,
    '',
    `Here is your schedule for today:`,
    '',
    ...textLines
  ].join('\n')

  const rows = sorted.map(({ appointment, schedule }, index) => `
    <tr>
      <td style="padding:14px 0;${index === sorted.length - 1 ? '' : `border-bottom:1px solid ${BORDER};`}vertical-align:top;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="width:6px;background-color:${BRAND};border-radius:3px;"></td>
            <td style="padding-left:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <div style="font-size:13px;font-weight:700;color:${BRAND_DARK};">${escapeHtml(formatWhen(appointment.startAt, appointment.timezone))}</div>
              <div style="font-size:15px;font-weight:600;color:${INK};margin-top:2px;">${escapeHtml(appointment.customerName)}</div>
              <div style="font-size:13px;color:${MUTED};margin-top:1px;">${escapeHtml(schedule.name)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('')

  const body = `
    <p style="margin:0 0 4px 0;font-size:15px;">Hi ${escapeHtml(ownerName)},</p>
    <h1 style="margin:12px 0 4px 0;font-size:22px;line-height:1.3;font-weight:700;color:${INK};">
      ${count === 1 ? 'You have 1 appointment' : `You have ${count} appointments`} ${todayBadge()}
    </h1>
    <p style="margin:0 0 20px 0;font-size:14px;color:${MUTED};">Here's your schedule for the day.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CANVAS};border-radius:12px;padding:2px 20px;">
      ${rows}
    </table>
  `

  return { subject, html: emailShell(subject, body), text }
}
