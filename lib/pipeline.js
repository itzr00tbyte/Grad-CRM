/** Pipeline judgement: what a deal is worth, and which ones are being neglected.
 *  Kept out of the page so the numbers a founder forecasts on are testable. */

export const OPEN_STAGES = ['inquiry', 'demo', 'pilot', 'proposal', 'negotiation']
export const CLOSED_STAGES = ['won', 'lost']

/** Chance of closing, by stage. A running pilot is the strong signal in this business —
 *  the school has already put teachers and timetable behind it. Tune these against your own
 *  win rate once there is a year of closed deals to look at; they are a guess until then. */
export const STAGE_ODDS = {
  inquiry: 0.1,
  demo: 0.25,
  pilot: 0.5,
  proposal: 0.6,
  negotiation: 0.8,
  won: 1,
  lost: 0,
}

export const isOpen = (deal) => OPEN_STAGES.includes(deal.stage)

/** Raw sum is what the pipeline would be worth if everything closed, which it will not.
 *  The weighted figure is the one to forecast cash on. */
export function pipelineValue(deals) {
  const open = deals.filter(isOpen)
  return {
    count: open.length,
    raw: round2(open.reduce((s, x) => s + Number(x.value || 0), 0)),
    weighted: round2(open.reduce((s, x) => s + Number(x.value || 0) * (STAGE_ODDS[x.stage] ?? 0), 0)),
  }
}

export function byStage(deals) {
  const out = {}
  for (const s of [...OPEN_STAGES, ...CLOSED_STAGES]) out[s] = { count: 0, value: 0 }
  for (const dl of deals) {
    if (!out[dl.stage]) out[dl.stage] = { count: 0, value: 0 }
    out[dl.stage].count++
    out[dl.stage].value = round2(out[dl.stage].value + Number(dl.value || 0))
  }
  return out
}

// Academic-calendar selling is slow, so a fortnight of silence is only a nudge; a month is a
// deal going cold. Closed deals are never stale — there is nothing left to do on them.
export const QUIET_DAYS = 14
export const COLD_DAYS = 30

/** Days since the last logged activity, falling back to the day the deal was created —
 *  a deal nobody has ever touched is the most neglected kind, not the freshest. */
export function daysQuiet(deal, today = new Date()) {
  const last = deal.last_touch || deal.created_at
  if (!last) return null
  return Math.floor((startOfDay(today) - startOfDay(new Date(last))) / 86400000)
}

/**
 * What, if anything, is wrong with this deal. Ranked worst first so a list can sort on it.
 * `next_due` is the earliest open follow-up; `last_touch` the most recent logged activity.
 */
export function dealHealth(deal, today = new Date()) {
  if (!isOpen(deal)) return { level: 0, key: 'closed', label: '' }

  const quiet = daysQuiet(deal, today)
  const overdue =
    deal.next_due && startOfDay(new Date(deal.next_due)) < startOfDay(today)
      ? Math.floor((startOfDay(today) - startOfDay(new Date(deal.next_due))) / 86400000)
      : 0

  if (overdue) return { level: 4, key: 'overdue', label: `follow-up ${overdue}d overdue` }
  if (!deal.next_due) return { level: 3, key: 'nostep', label: 'no next step' }
  if (quiet >= COLD_DAYS) return { level: 2, key: 'cold', label: `${quiet}d quiet` }
  if (quiet >= QUIET_DAYS) return { level: 1, key: 'quiet', label: `${quiet}d quiet` }
  return { level: 0, key: 'ok', label: '' }
}

/** Deals that want a human today, worst first. This is the list the CRM exists to produce. */
export function needsAttention(deals, today = new Date()) {
  return deals
    .filter(isOpen)
    .map((deal) => ({ deal, health: dealHealth(deal, today) }))
    .filter((x) => x.health.level > 0)
    .sort((a, b) => b.health.level - a.health.level || daysQuiet(b.deal, today) - daysQuiet(a.deal, today))
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100
const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
