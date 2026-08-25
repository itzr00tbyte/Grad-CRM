import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set (see .env.example)')

// ponytail: one connection pool on globalThis so dev hot-reload does not leak pools.
const sql =
  globalThis.__sql ??
  postgres(url, {
    max: 5,
    // Every date in this app is an Indian one. Without this, a UTC-hosted database makes
    // current_date roll over at 05:30 IST: invoices, attendance punches and aging all
    // book to the previous day for anyone working early. Override with TZ if you move.
    connection: { TimeZone: process.env.PGTZ || 'Asia/Kolkata' },
    types: {
      // numeric arrives as a string by default; every money field would need Number() at each use.
      numeric: { to: 1700, from: [1700], serialize: (x) => String(x), parse: (x) => parseFloat(x) },
    },
  })

if (process.env.NODE_ENV !== 'production') globalThis.__sql = sql

export default sql
