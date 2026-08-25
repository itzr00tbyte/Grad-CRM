/**
 * Regex validator for school / institute names in SchoolGrads CRM.
 *
 * Rejects:
 * - Empty / whitespace-only / less than 3 characters
 * - Emails or website URLs (e.g. info@school.com, https://example.com, example.in)
 * - Pure digits or symbols (e.g. "123", "---", "—", "###")
 * - OCR / placeholder markers (e.g. "(Institute not visible in OCR)", "NA", "Nil", "Unknown")
 * - Standalone contact person names with salutations (e.g. "Ms. Jane Doe", "Fr. Sunil Fernandes, SJ")
 */

export function isValidSchoolName(name) {
  if (!name || typeof name !== 'string') return false
  const str = name.trim()

  // 1. Minimum length (at least 3 characters)
  if (str.length < 3) return false

  // 2. Reject email addresses or web URLs/domains
  if (/@/.test(str) || /https?:\/\/|\.(com|org|in|edu|net|ai|io)\b/i.test(str)) {
    return false
  }

  // 3. Reject pure digits, pure punctuation, or placeholders
  if (/^\d+$/.test(str) || /^[^a-zA-Z0-9\u0900-\u097F]+$/.test(str)) return false
  if (/\b(not visible|unknown|undefined|n\/a|placeholder)\b/i.test(str)) return false
  if (/^\(.*\)$/.test(str) || /^(na|no|nil|null|none|-+)$/i.test(str)) return false

  // 4. Reject standalone contact person names with salutations (unless containing a school keyword)
  if (
    /^(Mr\.|Ms\.|Mrs\.|Fr\.)\s+[A-Z][a-z]+\s+[A-Z][a-z]+(\s*,\s*[A-Z]+)?$/i.test(str) &&
    !/\b(School|Academy|Institute|College|Public|International|Convent|Gurukul|Vidya|Shiksha|Kendra|High|Preschool|Kindergarten|Montessori|Campus|Education|Trust|Foundation|University|Bal|Learning|Global|Central|St\.|Saint|Sacred|Good Shepherd|Don Bosco|DPS|KV|DAV|Years|Samaj)\b/i.test(str)
  ) {
    return false
  }

  return true
}

export const SCHOOL_NAME_REGEX = /^(?!\d+$)(?![^a-zA-Z0-9\u0900-\u097F]+$)(?![^@]+@[^@]+\.[^@]+$)(?!(https?:\/\/|\.(com|org|in|edu|net|ai|io)\b)).{3,255}$/i
