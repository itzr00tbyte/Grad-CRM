import './globals.css'
import { getUser, can } from '../lib/auth'
import { logoutAction } from './actions'
import AppShell from '../components/layout/AppShell'

export const metadata = { title: 'School Grads Enterprise CRM' }
export const dynamic = 'force-dynamic'

const SECTIONS = ['schools', 'crm', 'billing', 'delivery', 'campaigns', 'finance', 'people', 'catalog', 'reports']

export default async function RootLayout({ children }) {
  const user = await getUser()
  
  const allowedSections = user
    ? SECTIONS.reduce((acc, sec) => {
        acc[sec] = can(user, sec)
        return acc
      }, {})
    : {}

  return (
    <html lang="en">
      <body>
        <AppShell user={user} allowedSections={allowedSections} logoutAction={logoutAction}>
          {children}
        </AppShell>
      </body>
    </html>
  )
}
