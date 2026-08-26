import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import sql from './db'

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'dev-only-secret-set-SESSION_SECRET-in-env'
)
const COOKIE = 'sg_session'

export const ROLES = ['employee', 'sales', 'ops', 'finance', 'admin']

// Which roles may open which section. Employee gets self-service only.
export const ACCESS = {
  schools: ['admin', 'sales', 'ops', 'finance'],
  crm: ['admin', 'sales'],
  catalog: ['admin', 'sales', 'finance'],
  billing: ['admin', 'sales', 'finance'],
  finance: ['admin', 'finance'],
  delivery: ['admin', 'ops', 'sales'],
  people: ['admin', 'finance'],
  reports: ['admin', 'sales', 'finance'],
  campaigns: ['admin', 'sales', 'marketing'],
  me: ['admin', 'sales', 'ops', 'finance', 'employee'],
}

export function can(user, section) {
  return !!user && (ACCESS[section] || []).includes(user.role)
}

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10)
}

export function checkPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash)
}

// Five wrong passwords for one email buys a fifteen-minute wait, so the login form is not a
// free place to guess. Keyed by email, not IP: the whole team shares one office address.
// ponytail: a per-process Map. Correct on one instance, which is what this runs on; a second
// instance would each keep their own count, so move it to a table if this ever scales out.
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000
const attempts = new Map()

function throttle(key) {
  const rec = attempts.get(key)
  if (!rec) return null
  if (Date.now() > rec.until) {
    attempts.delete(key)
    return null
  }
  if (rec.n < MAX_ATTEMPTS) return null
  return Math.ceil((rec.until - Date.now()) / 60000)
}

function recordFailure(key) {
  const rec = attempts.get(key)
  const n = rec && Date.now() <= rec.until ? rec.n + 1 : 1
  attempts.set(key, { n, until: Date.now() + LOCKOUT_MS })
}

/** Returns { user } on success, { error } otherwise. The wrong-credentials message is
 *  deliberately the same whether or not the email exists. */
export async function login(email, password) {
  const key = String(email || '').trim().toLowerCase()
  const wait = throttle(key)
  if (wait) return { error: `Too many failed attempts. Try again in ${wait} minute${wait > 1 ? 's' : ''}.` }

  const [u] = await sql`select * from users where lower(email) = lower(${email}) and active`
  if (!u || !bcrypt.compareSync(password, u.password_hash)) {
    recordFailure(key)
    return { error: 'Wrong email or password.' }
  }
  attempts.delete(key)

  const token = await new SignJWT({ uid: u.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)
  const jar = await cookies()
  const isHttps = process.env.COOKIE_SECURE === 'true'
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return { user: u }
}

export async function logout() {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export async function getUser() {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    const [u] = await sql`select id, name, email, role from users where id = ${payload.uid} and active`
    return u || null
  } catch {
    return null
  }
}

/** Guard for a page or action. Pass a section name from ACCESS, or nothing for "any logged-in user". */
export async function requireUser(section) {
  const u = await getUser()
  if (!u) redirect('/login')
  if (section && !can(u, section)) redirect('/?denied=' + section)
  return u
}
