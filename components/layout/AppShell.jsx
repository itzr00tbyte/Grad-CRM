'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

const NAV_GROUPS = [
  {
    title: 'Main',
    items: [
      { href: '/', label: 'Dashboard', section: null, icon: 'home' },
    ]
  },
  {
    title: 'Sales & CRM',
    items: [
      { href: '/schools', label: 'Schools / Leads', section: 'schools', icon: 'building' },
      { href: '/crm', label: 'Sales Pipeline', section: 'crm', icon: 'pipeline' },
      { href: '/quotes', label: 'Quotes', section: 'billing', icon: 'file-text' },
    ]
  },
  {
    title: 'Operations',
    items: [
      { href: '/delivery', label: 'Delivery & Ops', section: 'delivery', icon: 'truck' },
      { href: '/campaigns', label: 'Campaigns', section: 'campaigns', icon: 'megaphone' },
      { href: '/catalog', label: 'Catalog', section: 'catalog', icon: 'book' },
    ]
  },
  {
    title: 'Finance & Team',
    items: [
      { href: '/invoices', label: 'Invoices', section: 'billing', icon: 'receipt' },
      { href: '/finance', label: 'Finance', section: 'finance', icon: 'dollar' },
      { href: '/people', label: 'People / HR', section: 'people', icon: 'users' },
      { href: '/reports', label: 'Reports', section: 'reports', icon: 'chart' },
    ]
  }
]

function Icon({ name }) {
  switch (name) {
    case 'home':
      return (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    case 'building':
      return (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
        </svg>
      )
    case 'pipeline':
      return (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      )
    case 'file-text':
      return (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case 'truck':
      return (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      )
    case 'megaphone':
      return (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 11 18-5v12L3 13v-2z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
      )
    case 'book':
      return (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    case 'receipt':
      return (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
          <line x1="8" y1="6" x2="16" y2="6" />
          <line x1="8" y1="10" x2="16" y2="10" />
          <line x1="8" y1="14" x2="12" y2="14" />
        </svg>
      )
    case 'dollar':
      return (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    case 'users':
      return (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'chart':
      return (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    default:
      return null
  }
}

export default function AppShell({ user, allowedSections, logoutAction, children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = usePathname()

  if (!user) {
    return <main>{children}</main>
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/schools?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <a className="sidebar-brand" href="/">
            <img src="/brand/school-grads-logo.svg" alt="School Grads" />
            {!collapsed && <span>SCHOOL GRADS</span>}
          </a>
          <button
            type="button"
            className="sidebar-toggle-btn noprint"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {collapsed ? (
                <path d="m13 17 5-5-5-5M6 17l5-5-5-5" />
              ) : (
                <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />
              )}
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter(
              (item) => !item.section || allowedSections[item.section]
            )

            if (items.length === 0) return null

            return (
              <div key={group.title} className="nav-group">
                <div className="nav-group-title">{group.title}</div>
                {items.map((item) => {
                  const isActive =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname.startsWith(item.href)

                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon name={item.icon} />
                      {!collapsed && <span>{item.label}</span>}
                    </a>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <a
            href="/me"
            className={`nav-item ${pathname === '/me' ? 'active' : ''}`}
            title={collapsed ? 'My Profile' : undefined}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3" />
              <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
            </svg>
            {!collapsed && <span>My Account</span>}
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main-wrapper">
        {/* Topbar */}
        <header className="app-topbar noprint">
          <div className="topbar-left">
            <form className="global-search-container" onSubmit={handleSearchSubmit}>
              <svg className="global-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="global-search-input"
                placeholder="Search leads, schools, contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>

          <div className="topbar-right">
            {allowedSections.schools && (
              <a href="/schools?action=new" className="btn ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>
                + Add School
              </a>
            )}
            {allowedSections.crm && (
              <a href="/crm" className="btn" style={{ padding: '6px 12px', fontSize: '12px' }}>
                + New Deal
              </a>
            )}
            
            <div className="user-profile-badge">
              <span>{user.name}</span>
              <span className="role-pill">{user.role}</span>
            </div>

            <form action={logoutAction} style={{ display: 'inline' }}>
              <button
                type="submit"
                className="ghost"
                style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--line)' }}
              >
                Logout
              </button>
            </form>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  )
}
