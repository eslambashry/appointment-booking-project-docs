import type { HydratedDocument } from 'mongoose'
import type { AppointmentDocument } from '../models/Appointment'
import type { ScheduleDocument } from '../models/Schedule'
import { BRAND_DARK, CANVAS, INK, MUTED, TINT, badge, button, detailRow, emailShell, escapeHtml, formatWhen, locationLine } from './email-template'

interface BookingEmailInput {
  appointment: Pick<HydratedDocument<AppointmentDocument>, 'customerName' | 'startAt' | 'timezone' | 'confirmationCode'>
  schedule: Pick<ScheduleDocument, 'name' | 'locationType' | 'locationValue'>
}

export function buildBookingConfirmationEmail(
  { appointment, schedule }: BookingEmailInput,
  ownerName: string
): { subject: string; html: string; text: string } {
  const when = formatWhen(appointment.startAt, appointment.timezone)
  const subject = `Booking confirmed — ${schedule.name} with ${ownerName}`

  const text = [
    `Hi ${appointment.customerName},`,
    '',
    `Your appointment is confirmed.`,
    '',
    `${schedule.name}`,
    when,
    locationLine(schedule),
    `Confirmation code: ${appointment.confirmationCode}`,
    '',
    `We'll send you a reminder on the day of your appointment.`,
    `Need to make a change? Contact ${ownerName} directly.`
  ].join('\n')

  const body = `
    <p style="margin:0 0 4px 0;font-size:15px;">Hi ${escapeHtml(appointment.customerName)},</p>
    <h1 style="margin:12px 0 20px 0;font-size:22px;line-height:1.3;font-weight:700;color:${INK};">
      You're booked ${badge('CONFIRMED')}
    </h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CANVAS};border-radius:12px;padding:4px 20px;margin-bottom:20px;">
      ${detailRow('What', escapeHtml(schedule.name))}
      ${detailRow('When', escapeHtml(when))}
      ${detailRow('Where', escapeHtml(locationLine(schedule)))}
      ${detailRow('Confirmation', `<span style="display:inline-block;background-color:${TINT};color:${BRAND_DARK};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;font-weight:700;padding:3px 8px;border-radius:6px;letter-spacing:0.02em;">${escapeHtml(appointment.confirmationCode)}</span>`, true)}
    </table>
    <p style="margin:0 0 16px 0;font-size:14px;color:${MUTED};line-height:1.6;">
      We'll send you a reminder on the day of your appointment.
    </p>
    <p style="margin:0;font-size:14px;color:${MUTED};line-height:1.6;">
      Need to make a change? Contact <strong style="color:${INK};">${escapeHtml(ownerName)}</strong> directly.
    </p>
  `

  return { subject, html: emailShell(`Confirmed: ${schedule.name} on ${when}`, body), text }
}

interface CancellationEmailInput extends BookingEmailInput {
  rebookUrl?: string
}

export function buildCancellationEmail(
  { appointment, schedule, rebookUrl }: CancellationEmailInput,
  ownerName: string
): { subject: string; html: string; text: string } {
  const when = formatWhen(appointment.startAt, appointment.timezone)
  const subject = `Your appointment with ${ownerName} has been cancelled`

  const text = [
    `Hi ${appointment.customerName},`,
    '',
    `Your appointment has been cancelled.`,
    '',
    `${schedule.name}`,
    `Was scheduled for ${when}`,
    '',
    `If you'd like to book a new time, you can do so here:`,
    rebookUrl ?? '',
    '',
    `Questions? Contact ${ownerName} directly.`
  ].filter(Boolean).join('\n')

  const body = `
    <p style="margin:0 0 4px 0;font-size:15px;">Hi ${escapeHtml(appointment.customerName)},</p>
    <h1 style="margin:12px 0 20px 0;font-size:22px;line-height:1.3;font-weight:700;color:${INK};">
      Appointment cancelled ${badge('CANCELLED', '#F3F4F6', '#374151')}
    </h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CANVAS};border-radius:12px;padding:4px 20px;margin-bottom:20px;">
      ${detailRow('What', escapeHtml(schedule.name))}
      ${detailRow('Was scheduled for', escapeHtml(when), true)}
    </table>
    ${rebookUrl
      ? `<p style="margin:0 0 16px 0;font-size:14px;color:${MUTED};line-height:1.6;">If you'd like to book a new time:</p>${button('Book a new time', rebookUrl)}`
      : ''}
    <p style="margin:${rebookUrl ? '20px' : '0'} 0 0 0;font-size:14px;color:${MUTED};line-height:1.6;">
      Questions? Contact <strong style="color:${INK};">${escapeHtml(ownerName)}</strong> directly.
    </p>
  `

  return { subject, html: emailShell(`Cancelled: ${schedule.name} on ${when}`, body), text }
}
