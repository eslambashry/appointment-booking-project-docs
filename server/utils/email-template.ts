import type { ScheduleDocument } from '../models/Schedule'

// Shared design system for every transactional/reminder email (day-of
// reminders, booking confirmation, cancellation) — extracted once two
// template files needed the exact same header/card/badge shapes, so the
// brand stays visually identical across all of them instead of drifting.

// The app's actual primary color (app/app.config.ts: ui.colors.primary =
// 'teal') and a small palette derived from it — email clients don't load an
// external stylesheet or read CSS variables, so every color has to be a
// literal hex inlined per element.
export const BRAND = '#00BBA7'
export const BRAND_DARK = '#0F766E' // accessible text-on-tint color (BRAND itself is too light for small text)
export const INK = '#111827'
export const MUTED = '#6B7280'
export const BORDER = '#E5E7EB'
export const TINT = '#ECFDF9'
export const CANVAS = '#F4F5F7'

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

const LOCATION_LABEL: Record<ScheduleDocument['locationType'], string> = {
  in_person: 'In person',
  phone: 'Phone call',
  video: 'Video call',
  custom: 'Location'
}

export function locationLine(schedule: Pick<ScheduleDocument, 'locationType' | 'locationValue'>): string {
  return `${LOCATION_LABEL[schedule.locationType]}: ${schedule.locationValue}`
}

// Formatted directly in the appointment's own stored timezone — for an
// email there's no "browser" to fall back on the way the frontend does (see
// scheduling-engine.ts's timezone comment), so this is the one place that
// actually converts into the IANA zone via Intl, not just wall-clock
// arithmetic.
export function formatWhen(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function badge(text: string, background = BRAND, color = '#ffffff'): string {
  return `<span style="display:inline-block;background-color:${background};color:${color};font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.03em;padding:4px 10px;border-radius:999px;">${escapeHtml(text)}</span>`
}

export function detailRow(label: string, valueHtml: string, isLast = false): string {
  return `
    <tr>
      <td style="padding:12px 0;${isLast ? '' : `border-bottom:1px solid ${BORDER};`}font-family:${FONT};font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top;width:96px;">${escapeHtml(label)}</td>
      <td style="padding:12px 0;${isLast ? '' : `border-bottom:1px solid ${BORDER};`}font-family:${FONT};font-size:14px;font-weight:600;color:${INK};">${valueHtml}</td>
    </tr>
  `
}

export function button(label: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:4px;">
      <tr>
        <td style="background-color:${BRAND};border-radius:8px;">
          <a href="${href}" style="display:inline-block;padding:10px 18px;font-family:${FONT};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>
  `
}

// Table-based layout, every style inlined — the only markup subset that
// renders consistently across real inboxes (Gmail strips <style> blocks in
// some views, Outlook uses Word's HTML engine). `previewText` is the
// snippet Gmail/Apple Mail show next to the subject in the inbox list;
// it's rendered hidden in the body since email has no <head><meta> for it.
export function emailShell(previewText: string, bodyHtml: string): string {
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
                <td style="padding-left:10px;font-family:${FONT};font-size:17px;font-weight:700;color:${INK};">
                  Schedulo
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;font-family:${FONT};color:${INK};">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background-color:${CANVAS};text-align:center;font-family:${FONT};font-size:12px;color:${MUTED};">
            Sent by Schedulo — appointment scheduling made simple.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`
}
