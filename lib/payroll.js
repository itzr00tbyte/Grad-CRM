/** Telangana Professional Tax slabs + payslip net. Verify slabs with a CA each FY. */

export function professionalTax(monthlyGross) {
  if (monthlyGross > 20000) return 200
  if (monthlyGross >= 15000) return 150
  return 0
}

export function payslipTotals({ basic = 0, hra = 0, allowances = 0, pt = 0, tds = 0, other_deductions = 0 }) {
  const gross = Number(basic) + Number(hra) + Number(allowances)
  const deductions = Number(pt) + Number(tds) + Number(other_deductions)
  return { gross, deductions, net: Math.round((gross - deductions) * 100) / 100 }
}

// Neither scheme is triggered yet, which is exactly why this needs to shout before it is:
// registration is a deadline, not a decision, and nobody watches a headcount that grows one
// hire at a time. The portal captures UAN and ESIC numbers already; it files nothing.
export const ESI_HEADCOUNT = 10
export const PF_HEADCOUNT = 20
const APPROACHING = 2

export function statutoryAlerts(headcount) {
  const out = []
  if (headcount >= ESI_HEADCOUNT)
    out.push(
      `ESI is mandatory from ${ESI_HEADCOUNT} employees and you have ${headcount}. It covers everyone at or under ₹21,000/month gross — employer 3.25%, employee 0.75%, remitted by the 15th. Register now.`
    )
  else if (headcount >= ESI_HEADCOUNT - APPROACHING)
    out.push(`${headcount} employees. ESI registration is triggered at ${ESI_HEADCOUNT} — line up the paperwork before the next hire.`)

  if (headcount >= PF_HEADCOUNT)
    out.push(`EPF is mandatory from ${PF_HEADCOUNT} employees and you have ${headcount}. Employer 12%, wage ceiling ₹15,000. Register now.`)
  else if (headcount >= PF_HEADCOUNT - APPROACHING)
    out.push(`${headcount} employees. EPF registration is triggered at ${PF_HEADCOUNT}.`)

  return out
}

/** CL and SL share one bucket (Telangana norms lump them); EL has its own.
 *  LOP is unpaid, so it is always allowed. Pending requests count against the
 *  balance — otherwise ten pending applications all pass and all get approved. */
export function leaveRemaining(employee, used) {
  return {
    cl: Number(employee.cl_total) - Number(used.cl || 0),
    el: Number(employee.el_total) - Number(used.el || 0),
  }
}

export function leaveAllowed(kind, days, remaining) {
  if (kind === 'LOP') return true
  return days <= (kind === 'EL' ? remaining.el : remaining.cl)
}

/** Inclusive day count. ponytail: counts weekends/holidays too — add a holiday table only if staff complain. */
export function leaveDays(from, to) {
  const a = new Date(from)
  const b = new Date(to)
  return Math.floor((b - a) / 86400000) + 1
}
