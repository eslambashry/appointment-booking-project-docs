import type { HydratedDocument } from 'mongoose'
import type { AppointmentDocument } from '../models/Appointment'
import type { ScheduleDocument } from '../models/Schedule'
import { BORDER, BRAND, BRAND_DARK, CANVAS, INK, MUTED, TINT, badge, detailRow, emailShell, escapeHtml, formatWhen, locationLine } from './email-template'

interface ReminderAppointment {
  appointment: HydratedDocument<AppointmentDocument>
  schedule: HydratedDocument<ScheduleDocument>
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

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
      You have an appointment ${badge('TODAY')}
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
            <td style="padding-left:14px;font-family:${FONT};">
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
      ${count === 1 ? 'You have 1 appointment' : `You have ${count} appointments`} ${badge('TODAY')}
    </h1>
    <p style="margin:0 0 20px 0;font-size:14px;color:${MUTED};">Here's your schedule for the day.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CANVAS};border-radius:12px;padding:2px 20px;">
      ${rows}
    </table>
  `

  return { subject, html: emailShell(subject, body), text }
}
