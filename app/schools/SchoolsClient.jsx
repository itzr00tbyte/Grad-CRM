'use client'

import { useState, useMemo } from 'react'
import { Card, Field, Tag, STATUSES, BOARDS } from '../../components/ui'
import { SubmitButton } from '../../components/submit'
import { createSchool } from './actions'

export default function SchoolsClient({ initialRows, err, initialSearch, user, salesUsers = [] }) {
  const [searchTerm, setSearchTerm] = useState(initialSearch || '')
  const [statusFilter, setStatusFilter] = useState('')
  const [boardFilter, setBoardFilter] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [mySchoolsOnly, setMySchoolsOnly] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [page, setPage] = useState(0)
  const rowsPerPage = 25

  const isAdmin = user?.role === 'admin'

  // Extract unique cities & owners for dynamic dropdown filters
  const cities = useMemo(() => {
    const set = new Set(initialRows.map((r) => r.city).filter(Boolean))
    return Array.from(set).sort()
  }, [initialRows])

  const owners = useMemo(() => {
    const set = new Set(initialRows.map((r) => r.owner).filter(Boolean))
    return Array.from(set).sort()
  }, [initialRows])

  // Instant Auto-Filtering
  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return initialRows.filter((r) => {
      // My Schools toggle — filter to current user's assigned schools
      if (mySchoolsOnly) {
        if (r.owner_id !== user?.id) return false
      }

      // Letter-by-letter Search
      if (term) {
        const matchesName = r.name?.toLowerCase().includes(term)
        const matchesPoc = r.poc_name?.toLowerCase().includes(term)
        const matchesPhone = r.poc_phone?.toLowerCase().includes(term)
        const matchesEmail = r.poc_email?.toLowerCase().includes(term)
        const matchesCity = r.city?.toLowerCase().includes(term)
        const matchesBoard = r.board?.toLowerCase().includes(term)
        const matchesSegment = r.segment?.toLowerCase().includes(term)
        const matchesOwner = r.owner?.toLowerCase().includes(term)

        if (!(matchesName || matchesPoc || matchesPhone || matchesEmail || matchesCity || matchesBoard || matchesSegment || matchesOwner)) {
          return false
        }
      }

      if (statusFilter && r.status !== statusFilter) return false
      if (boardFilter && r.board !== boardFilter) return false
      if (segmentFilter && r.segment !== segmentFilter) return false
      if (cityFilter && r.city !== cityFilter) return false
      if (ownerFilter && (r.owner || 'Unassigned') !== ownerFilter) return false

      return true
    })
  }, [initialRows, searchTerm, statusFilter, boardFilter, segmentFilter, cityFilter, ownerFilter, mySchoolsOnly, user])

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1
  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage
    return filteredRows.slice(start, start + rowsPerPage)
  }, [filteredRows, page, rowsPerPage])

  const hasActiveFilters = Boolean(searchTerm || statusFilter || boardFilter || segmentFilter || cityFilter || ownerFilter || mySchoolsOnly)

  const clearAllFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setBoardFilter('')
    setSegmentFilter('')
    setCityFilter('')
    setOwnerFilter('')
    setMySchoolsOnly(false)
    setPage(0)
  }

  // Counts for badges
  const myCount = initialRows.filter((r) => r.owner_id === user?.id).length
  const unassignedCount = initialRows.filter((r) => !r.owner_id).length

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1>School Accounts & Contacts</h1>
          <p className="page-subtitle">Search by Contact Person (POC) or School Name with instant live filtering.</p>
        </div>
        <div className="page-actions">
          <a href="/schools/import" className="btn ghost">
            Import CSV
          </a>
          <button type="button" className="btn" onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? 'Close Form' : '+ Add School'}
          </button>
        </div>
      </div>

      {err && <p className="err">{err}</p>}

      {/* Quick KPI Summary Bar */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 4 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '12px 16px', cursor: 'pointer' }}
          onClick={() => { setMySchoolsOnly(false); clearAllFilters(); }}>
          <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>All Schools</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--navy)' }}>{initialRows.length}</div>
        </div>
        <div style={{ background: mySchoolsOnly ? 'var(--blue-light, #e8f0fe)' : 'var(--surface)', border: `1px solid ${mySchoolsOnly ? 'var(--blue)' : 'var(--line)'}`, borderRadius: 'var(--r)', padding: '12px 16px', cursor: 'pointer' }}
          onClick={() => { setMySchoolsOnly(true); setPage(0); }}>
          <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>My Schools</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--navy)' }}>{myCount}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '12px 16px', cursor: 'pointer' }}
          onClick={() => { setOwnerFilter('Unassigned'); setMySchoolsOnly(false); setPage(0); }}>
          <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Unassigned</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: unassignedCount > 0 ? 'var(--bad-fg)' : 'var(--good-fg)' }}>{unassignedCount}</div>
        </div>
        {STATUSES.map((s) => {
          const c = initialRows.filter((r) => r.status === s).length
          return (
            <div key={s} style={{ background: statusFilter === s ? 'var(--blue-light, #e8f0fe)' : 'var(--surface)', border: `1px solid ${statusFilter === s ? 'var(--blue)' : 'var(--line)'}`, borderRadius: 'var(--r)', padding: '12px 16px', cursor: 'pointer' }}
              onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setMySchoolsOnly(false); setPage(0); }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{s}</div>
              <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--navy)' }}>{c}</div>
            </div>
          )
        })}
      </div>

      {/* Add School Form */}
      {isAdding && (
        <Card title="Add New School & Contact Person">
          <form action={createSchool}>
            <div className="row">
              <Field label="School Name" name="name" required placeholder="e.g. ABC Public School" />
              <Field label="Board" name="board" options={BOARDS} />
              <Field label="Segment" name="segment" options={['', 'k12', 'preschool']} />
              <Field label="City" name="city" placeholder="e.g. Hyderabad" />
              <Field label="GSTIN" name="gstin" placeholder="36AAAAA0000A1Z5" />
              <Field label="PAN" name="pan" placeholder="AAAAA0000A" />
              <Field label="Status" name="status" options={STATUSES} />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn ghost" onClick={() => setIsAdding(false)}>Cancel</button>
              <SubmitButton>Create Lead</SubmitButton>
            </div>
          </form>
        </Card>
      )}

      {/* Filter Toolbar */}
      <div className="filter-bar" style={{ gap: 10 }}>
        <div className="filter-group" style={{ margin: 0, gap: 10 }}>
          {/* Live Search */}
          <div style={{ flex: '1 1 280px', minWidth: 220, position: 'relative' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0) }}
              placeholder="🔍 Search by Contact Person, School, City, Phone..."
              style={{ margin: 0, paddingRight: searchTerm ? 30 : 12 }}
              autoFocus
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 0, color: 'var(--ink-muted)', cursor: 'pointer', padding: 2, fontSize: 14 }}>
                ✕
              </button>
            )}
          </div>

          <div style={{ flex: '0 1 140px' }}>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }} style={{ margin: 0 }}>
              <option value="">All Statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ flex: '0 1 120px' }}>
            <select value={boardFilter} onChange={(e) => { setBoardFilter(e.target.value); setPage(0) }} style={{ margin: 0 }}>
              <option value="">All Boards</option>
              {BOARDS.filter(Boolean).map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div style={{ flex: '0 1 130px' }}>
            <select value={segmentFilter} onChange={(e) => { setSegmentFilter(e.target.value); setPage(0) }} style={{ margin: 0 }}>
              <option value="">All Segments</option>
              <option value="k12">K-12</option>
              <option value="preschool">Preschool</option>
            </select>
          </div>

          {cities.length > 0 && (
            <div style={{ flex: '0 1 130px' }}>
              <select value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); setPage(0) }} style={{ margin: 0 }}>
                <option value="">All Cities</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {isAdmin && owners.length > 0 && (
            <div style={{ flex: '0 1 140px' }}>
              <select value={ownerFilter} onChange={(e) => { setOwnerFilter(e.target.value); setPage(0) }} style={{ margin: 0 }}>
                <option value="">All Owners</option>
                <option value="Unassigned">Unassigned</option>
                {owners.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}

          {/* My Schools Toggle */}
          <button
            type="button"
            onClick={() => { setMySchoolsOnly(!mySchoolsOnly); setPage(0) }}
            className={mySchoolsOnly ? 'btn' : 'btn ghost'}
            style={{ padding: '7px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
          >
            {mySchoolsOnly ? '✓ My Schools' : 'My Schools'}
          </button>

          {hasActiveFilters && (
            <button type="button" className="btn ghost" onClick={clearAllFilters}
              style={{ padding: '7px 12px', fontSize: 12, border: '1px solid var(--line)' }}>
              Clear All
            </button>
          )}
        </div>

        <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          Showing <strong>{filteredRows.length}</strong> of {initialRows.length} lead(s)
        </div>
      </div>

      {/* Live Filtered Data Grid */}
      <Card>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>School Reference</th>
                <th>Contact Person (POC)</th>
                <th>Board</th>
                <th>City</th>
                <th>Status</th>
                <th>Open Deals</th>
                <th>Renewal Date</th>
                <th>Account Owner</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: 'center', padding: '32px' }}>
                    No matching schools found.
                    {hasActiveFilters && (
                      <button type="button" className="btn ghost" onClick={clearAllFilters} style={{ marginLeft: 12 }}>
                        Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <a href={`/schools/${e.id}`} style={{ fontWeight: 700, color: 'var(--navy)' }}>
                        {e.name}
                      </a>
                      {e.segment && <span className="tag" style={{ marginLeft: 6, fontSize: 10 }}>{e.segment}</span>}
                    </td>
                    <td>
                      {e.poc_name ? (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>👤 {e.poc_name}</div>
                          {e.poc_phone && (
                            <a href={`tel:${e.poc_phone}`} className="muted" style={{ fontSize: 11 }}>📞 {e.poc_phone}</a>
                          )}
                        </div>
                      ) : (
                        <span className="muted" style={{ fontStyle: 'italic', fontSize: 12 }}>No POC Logged</span>
                      )}
                    </td>
                    <td>{e.board || '—'}</td>
                    <td>{e.city || '—'}</td>
                    <td><Tag v={e.status} /></td>
                    <td>
                      {e.open_deals > 0
                        ? <span className="tag active">{e.open_deals} open</span>
                        : <span className="muted">0</span>}
                    </td>
                    <td>{e.renewal_date ? new Date(e.renewal_date).toISOString().slice(0, 10) : '—'}</td>
                    <td>
                      {e.owner ? (
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{e.owner}</span>
                      ) : (
                        <span className="tag overdue" style={{ fontSize: 10 }}>Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="row" style={{ marginTop: 16, justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="muted" style={{ fontSize: 12 }}>Page {page + 1} of {totalPages}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn ghost" disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{ opacity: page === 0 ? 0.5 : 1 }}>
                ← Previous
              </button>
              <button type="button" className="btn ghost" disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                style={{ opacity: page >= totalPages - 1 ? 0.5 : 1 }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </Card>
    </>
  )
}
