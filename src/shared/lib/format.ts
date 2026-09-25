// Locale-independent helpers. Anything that depends on the UI language
// (numbers, dates, "3 h 25 min"…) lives in `shared/i18n` – use `useFormatters()`.

export const formatDuration = (ms: number) => {
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const msToHours = (ms: number) => ms / 3_600_000
export const msToMinutes = (ms: number) => ms / 60_000
