// Dates render in IST regardless of where the app runs. toISOString() gave the UTC day,
// which is the previous one for anything logged before 05:30 IST. en-CA is the locale that
// formats as YYYY-MM-DD. A `date` column arrives as UTC midnight, so this leaves it alone;
// a `timestamptz` gets converted, which is the point.
export const TZ = process.env.APP_TZ || 'Asia/Kolkata'

export const inr = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const d = (v) => (v ? new Date(v).toLocaleDateString('en-CA', { timeZone: TZ }) : '')

export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ })

export const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000)
