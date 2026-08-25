'use client'

import { useState } from 'react'
import { Card, Field, Tag, STATUSES, BOARDS, STAGES, ROLE_TAGS, KPICard } from '../../../components/ui'
import { SubmitButton } from '../../../components/submit'
import { updateSchool, addContact, deleteContact, addDocument, createFolder, assignSchool, logEnquiry } from '../actions'
import { createDeal } from '../../crm/actions'
import { addActivity } from '../../actions'
import { inr, d } from '../../../lib/fmt'

const ENQUIRY_SOURCES = ['call', 'email', 'whatsapp', 'walk-in', 'referral', 'website', 'linkedin']
const ENQUIRY_OUTCOMES = ['', 'interested', 'not_interested', 'follow_up', 'demo_booked', 'rejected']

export default function SchoolDetailClient({
  e,
  contacts,
  deals,
  invoices,
  deliveries,
  docs,
  acts,
  parentFolder,
  campaigns,
  salesUsers = [],
  user,
  allowedBilling,
  allowedCrm,
  err,
  folderId
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)

  const isAdmin = user?.role === 'admin'
  const outstanding = invoices.reduce((s, i) => s + (i.status === 'cancelled' ? 0 : i.total - i.paid), 0)
  const activeDeals = deals.filter((x) => !['won', 'lost'].includes(x.stage))
  const pendingFollowUps = acts.filter((a) => a.due_on && !a.done_at)

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="/schools" className="muted" style={{ fontSize: 13 }}>← Back to Schools</a>
          </div>
          <h1 style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {e.name} <Tag v={e.status} />
            {/* Owner Badge */}
            {e.owner_name ? (
              <span style={{ fontSize: 13, fontWeight: 500, background: 'var(--canvas)', border: '1px solid var(--line)', borderRadius: 20, padding: '3px 10px', color: 'var(--ink-soft)' }}>
                👤 Assigned: {e.owner_name}
              </span>
            ) : (
              <span className="tag overdue" style={{ fontSize: 11 }}>Unassigned</span>
            )}
          </h1>
          <p className="page-subtitle">
            {[e.board, e.segment, e.city, e.state].filter(Boolean).join(' · ')}
            {e.gstin && ` · GSTIN: ${e.gstin}`}
            {e.pan && ` · PAN: ${e.pan}`}
          </p>
        </div>

        <div className="page-actions">
          {/* Admin: Assign School */}
          {isAdmin && (
            <button type="button" className="btn ghost"
              onClick={() => setIsAssigning(!isAssigning)}>
              {isAssigning ? 'Close Assignment' : '⟳ Assign to Rep'}
            </button>
          )}
          <button type="button" className="btn ghost"
            onClick={() => setIsEditingDetails(!isEditingDetails)}>
            {isEditingDetails ? 'Close Profile Editor' : '⚙ Edit Details'}
          </button>
          {allowedBilling && (
            <a href={`/invoices/new?entity=${e.id}`} className="btn ghost">+ New Invoice</a>
          )}
          {allowedCrm && (
            <button type="button" className="btn" onClick={() => setActiveTab('deals')}>+ Create Deal</button>
          )}
        </div>
      </div>

      {err && <p className="err">{err}</p>}

      {/* Admin: Assign Owner Inline Form */}
      {isAdmin && isAssigning && (
        <Card title="Assign School Account to Sales Rep">
          <form action={assignSchool} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <input type="hidden" name="id" value={e.id} />
            <div className="field" style={{ flex: '1 1 220px' }}>
              <label>Select Sales Representative</label>
              <select name="owner_id" defaultValue={e.owner_id || ''}>
                <option value="">— Unassigned (remove owner) —</option>
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: '0 0 auto' }}>
              <SubmitButton>Assign Rep</SubmitButton>
            </div>
          </form>
        </Card>
      )}

      {/* Edit Details Inline */}
      {isEditingDetails && (
        <Card title="Edit School Profile & Legal Details">
          <form action={updateSchool}>
            <input type="hidden" name="id" value={e.id} />
            <div className="row">
              <Field label="School Name" name="name" value={e.name} required />
              <Field label="Board" name="board" options={BOARDS} value={e.board} />
              <Field label="Segment" name="segment" options={['', 'k12', 'preschool']} value={e.segment} />
              <Field label="Status" name="status" options={STATUSES} value={e.status} />
              <Field label="City" name="city" value={e.city} />
              <Field label="State" name="state" value={e.state} />
              <Field label="GSTIN" name="gstin" value={e.gstin} placeholder="36AAAAA0000A1Z5" />
              <Field label="PAN" name="pan" value={e.pan} placeholder="AAAAA0000A" />
              <Field label="Pilot Start" name="pilot_start" type="date" value={d(e.pilot_start)} />
              <Field label="Pilot End" name="pilot_end" type="date" value={d(e.pilot_end)} />
              <Field label="Renewal Date" name="renewal_date" type="date" value={d(e.renewal_date)} />
              <Field label="Address" name="address" wide value={e.address} />
              <Field label="Pilot Success Criteria" name="success_criteria" type="textarea" wide value={e.success_criteria} />
              <Field label="Internal Account Notes" name="notes" type="textarea" wide value={e.notes} />
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn ghost" onClick={() => setIsEditingDetails(false)}>Cancel</button>
              <SubmitButton>Save Profile Details</SubmitButton>
            </div>
          </form>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid">
        <KPICard label="Decision Makers" value={contacts.length} subtext="Logged school contacts" />
        <KPICard label="Pending Follow-ups" value={pendingFollowUps.length}
          subtext={`${acts.length} total touchpoints`}
          trend={{ type: pendingFollowUps.length > 0 ? 'down' : 'up', value: pendingFollowUps.length > 0 ? 'Action Required' : 'On Track' }} />
        <KPICard label="Outstanding Balance" value={inr(outstanding)}
          subtext={`${invoices.length} invoice(s)`}
          trend={{ type: outstanding > 0 ? 'down' : 'up', value: outstanding > 0 ? 'Due' : 'Cleared' }} />
        <KPICard label="Active Deals" value={activeDeals.length} subtext={`${deals.length} total deal history`} />
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button type="button" className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview (Contacts & Follow-ups)
        </button>
        <button type="button" className={`tab-btn ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
          Contacts ({contacts.length})
        </button>
        {allowedCrm && (
          <button type="button" className={`tab-btn ${activeTab === 'deals' ? 'active' : ''}`} onClick={() => setActiveTab('deals')}>
            Deals ({deals.length})
          </button>
        )}
        {allowedBilling && (
          <button type="button" className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
            Billing ({invoices.length})
          </button>
        )}
        <button type="button" className={`tab-btn ${activeTab === 'delivery' ? 'active' : ''}`} onClick={() => setActiveTab('delivery')}>
          Delivery ({deliveries.length})
        </button>
        <button type="button" className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          Documents ({docs.length})
        </button>
        <button type="button" className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
          Full Activity Log ({acts.length})
        </button>
      </div>

      {/* TAB: OVERVIEW — Contacts + Enquiry + Follow-ups */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 16 }}>
          {/* Left: Contacts */}
          <div>
            <Card
              title={`Key Contacts & Decision Makers (${contacts.length})`}
              actions={
                <button type="button" className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => setActiveTab('contacts')}>
                  Manage Contacts →
                </button>
              }
            >
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Phone</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.length === 0 ? (
                      <tr><td colSpan={4} className="muted" style={{ padding: '16px', textAlign: 'center' }}>No contacts added yet.</td></tr>
                    ) : (
                      contacts.map((c) => (
                        <tr key={c.id}>
                          <td><strong style={{ color: 'var(--navy)' }}>{c.name}</strong></td>
                          <td><Tag v={c.role_tag} /></td>
                          <td>{c.phone ? <a href={`tel:${c.phone}`}>📞 {c.phone}</a> : '—'}</td>
                          <td>{c.email ? <a href={`mailto:${c.email}`} className="muted">{c.email}</a> : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Quick Account Summary */}
            <Card title="Account Overview">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: e.notes ? 12 : 0 }}>
                {[['Board', e.board], ['Segment', e.segment], ['Location', [e.city, e.state].filter(Boolean).join(', ')], ['Renewal Date', d(e.renewal_date)]].map(([k, v]) => (
                  <div key={k}>
                    <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>{k}</span>
                    <div style={{ fontWeight: 600 }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
              {e.notes && (
                <div style={{ background: 'var(--canvas)', padding: 12, borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', fontSize: 13 }}>
                  <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: 4 }}>Notes</span>
                  {e.notes}
                </div>
              )}
            </Card>
          </div>

          {/* Right: Enquiry Logger + Activity Timeline */}
          <div>
            {/* PROMINENT: Log Enquiry / Touchpoint */}
            <Card title="📝 Log Enquiry or Follow-up">
              <form action={logEnquiry}>
                <input type="hidden" name="entity_id" value={e.id} />
                <div className="row">
                  <div className="field">
                    <label>Enquiry Source</label>
                    <select name="source">
                      {ENQUIRY_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Contact Person (Optional)</label>
                    <select name="contact_id">
                      <option value="">— General / Unknown —</option>
                      {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.role_tag ? ` (${c.role_tag})` : ''}</option>)}
                    </select>
                  </div>
                  <Field label="Notes / Discussion *" name="note" required wide placeholder="What was discussed? Any interest shown, objections, next steps..." />
                  <div className="field">
                    <label>Outcome</label>
                    <select name="outcome">
                      {ENQUIRY_OUTCOMES.map((o) => <option key={o} value={o}>{o || '— No specific outcome —'}</option>)}
                    </select>
                  </div>
                  <Field label="Schedule Follow-up Date" name="due_on" type="date" />
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <SubmitButton>+ Log Enquiry</SubmitButton>
                </div>
              </form>
            </Card>

            {/* Activity Timeline */}
            <Card title={`Recent Activity (${acts.length})`}>
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Notes</th>
                      <th>Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acts.length === 0 ? (
                      <tr><td colSpan={4} className="muted" style={{ padding: '16px', textAlign: 'center' }}>No activity logged yet.</td></tr>
                    ) : (
                      acts.slice(0, 15).map((a) => (
                        <tr key={a.id}>
                          <td style={{ width: 90, fontSize: 12 }}>{d(a.created_at)}</td>
                          <td style={{ width: 90 }}>
                            <Tag v={a.kind} />
                          </td>
                          <td>
                            <div style={{ fontSize: 13 }}>{a.note}</div>
                            {a.contact_name && <div className="muted" style={{ fontSize: 11 }}>👤 {a.contact_name}</div>}
                            {a.outcome && <div className="muted" style={{ fontSize: 11 }}>[{a.outcome}]</div>}
                            <div className="muted" style={{ fontSize: 11 }}>by {a.owner || 'System'}</div>
                          </td>
                          <td>
                            {a.due_on && !a.done_at
                              ? <span className="tag overdue" style={{ fontSize: 10 }}>Due {d(a.due_on)}</span>
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB: CONTACTS */}
      {activeTab === 'contacts' && (
        <Card title={`All School Contacts (${contacts.length})`}>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Contact Name</th><th>Role Tag</th><th>Email</th><th>Phone</th><th className="right">Action</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr><td colSpan={5} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No contacts added yet.</td></tr>
                ) : (
                  contacts.map((c) => (
                    <tr key={c.id}>
                      <td><strong style={{ color: 'var(--navy)' }}>{c.name}</strong></td>
                      <td><Tag v={c.role_tag} /></td>
                      <td>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : '—'}</td>
                      <td>{c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : '—'}</td>
                      <td className="right">
                        <form action={deleteContact} style={{ display: 'inline' }}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="entity_id" value={e.id} />
                          <button className="danger" type="submit">Remove</button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <form action={addContact} className="row" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <input type="hidden" name="entity_id" value={e.id} />
            <Field label="Contact Name" name="name" required placeholder="Full Name" />
            <Field label="Role Tag" name="role_tag" options={ROLE_TAGS} />
            <Field label="Email" name="email" type="email" placeholder="email@school.com" />
            <Field label="Phone" name="phone" placeholder="+91 9876543210" />
            <div className="field"><SubmitButton className="ghost">+ Add Contact</SubmitButton></div>
          </form>
        </Card>
      )}

      {/* TAB: DEALS */}
      {activeTab === 'deals' && allowedCrm && (
        <Card title={`Deals & Opportunities (${deals.length})`}>
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Deal Title</th><th>Stage</th><th className="right">Value</th><th>Expected Close</th></tr>
              </thead>
              <tbody>
                {deals.length === 0 ? (
                  <tr><td colSpan={4} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No deals registered.</td></tr>
                ) : (
                  deals.map((x) => (
                    <tr key={x.id}>
                      <td><a href={`/crm/${x.id}`} style={{ fontWeight: 600, color: 'var(--navy)' }}>{x.title}</a></td>
                      <td><Tag v={x.stage} /></td>
                      <td className="right" style={{ fontWeight: 700 }}>{inr(x.value)}</td>
                      <td>{d(x.expected_close)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <form action={createDeal} className="row" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <input type="hidden" name="entity_id" value={e.id} />
            <Field label="Deal Title" name="title" required placeholder="e.g. Code School Finland Licence" />
            <Field label="Stage" name="stage" options={STAGES} />
            <Field label="Value ₹" name="value" type="number" step="0.01" placeholder="100000" />
            <Field label="Close Date" name="expected_close" type="date" />
            <div className="field">
              <label>Campaign</label>
              <select name="campaign_id">
                <option value="">None</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field"><SubmitButton>+ Add Deal</SubmitButton></div>
          </form>
        </Card>
      )}

      {/* TAB: INVOICES */}
      {activeTab === 'invoices' && allowedBilling && (
        <Card title={`Invoices & Billing (${invoices.length})`} actions={<a href={`/invoices/new?entity=${e.id}`} className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }}>New Invoice →</a>}>
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Number</th><th>Date</th><th>Status</th><th className="right">Total</th><th className="right">Due</th></tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={5} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No invoices yet.</td></tr>
                ) : (
                  invoices.map((i) => {
                    const due = i.total - i.paid
                    return (
                      <tr key={i.id}>
                        <td><a href={`/invoices/${i.id}`} style={{ fontWeight: 600 }}>{i.number}</a></td>
                        <td>{d(i.invoice_date)}</td>
                        <td><Tag v={due <= 0 ? 'paid' : i.status} /></td>
                        <td className="right">{inr(i.total)}</td>
                        <td className="right" style={{ fontWeight: 700, color: due > 0 ? 'var(--bad-fg)' : 'var(--good-fg)' }}>{inr(due)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB: DELIVERY */}
      {activeTab === 'delivery' && (
        <Card title={`Delivery Milestones (${deliveries.length})`} actions={<a href={`/delivery?entity=${e.id}`} className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }}>Plan Delivery →</a>}>
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Scheduled Date</th><th>Milestone</th><th>Trainer</th><th>Status</th></tr>
              </thead>
              <tbody>
                {deliveries.length === 0 ? (
                  <tr><td colSpan={4} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No milestones scheduled.</td></tr>
                ) : (
                  deliveries.map((x) => (
                    <tr key={x.id}>
                      <td>{d(x.scheduled_on)}</td>
                      <td><strong>{x.title}</strong></td>
                      <td>{x.trainer || 'Unassigned'}</td>
                      <td><Tag v={x.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB: DOCUMENTS */}
      {activeTab === 'documents' && (
        <Card title={`Documents (${docs.length})`}>
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Name</th><th>Type</th><th>Date</th></tr>
              </thead>
              <tbody>
                {folderId && (
                  <tr>
                    <td colSpan={3}>
                      <a href={`/schools/${e.id}${parentFolder?.parent_id ? `?folder=${parentFolder.parent_id}` : ''}`} style={{ fontWeight: 600 }}>📁 .. (Up)</a>
                    </td>
                  </tr>
                )}
                {docs.length === 0 && !folderId && (
                  <tr><td colSpan={3} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No documents yet.</td></tr>
                )}
                {docs.map((x) => (
                  <tr key={x.id}>
                    <td>
                      {x.is_folder
                        ? <a href={`/schools/${e.id}?folder=${x.id}`} style={{ fontWeight: 600 }}>📁 {x.title}</a>
                        : <a href={x.url ? x.url : `/api/files/${x.id}`} target="_blank" rel="noreferrer">📄 {x.title}</a>}
                    </td>
                    <td>{x.is_folder ? 'Folder' : x.kind || 'File'}</td>
                    <td>{d(x.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <form action={createFolder} className="row">
              <input type="hidden" name="entity_id" value={e.id} />
              {folderId && <input type="hidden" name="parent_id" value={folderId} />}
              <Field label="New Folder Name" name="name" required placeholder="Folder Name" />
              <div className="field"><SubmitButton className="ghost">Create Folder</SubmitButton></div>
            </form>
            <form action={addDocument} className="row">
              <input type="hidden" name="entity_id" value={e.id} />
              {folderId && <input type="hidden" name="parent_id" value={folderId} />}
              <div className="field">
                <label>Upload File *</label>
                <input type="file" name="file" required style={{ border: '1px solid var(--line)', padding: '6px', borderRadius: '4px' }} />
              </div>
              <Field label="Kind" name="kind" options={['contract', 'po', 'mou', 'other']} />
              <div className="field"><SubmitButton>Upload</SubmitButton></div>
            </form>
          </div>
        </Card>
      )}

      {/* TAB: FULL ACTIVITY LOG */}
      {activeTab === 'activity' && (
        <Card title={`Complete Activity & Discussion Log (${acts.length})`}>
          <form action={addActivity} className="row" style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
            <input type="hidden" name="entity_id" value={e.id} />
            <Field label="Kind" name="kind" options={['call', 'meeting', 'note', 'email', 'task', 'enquiry']} />
            <Field label="Notes / Summary" name="note" required placeholder="Log discussion notes or follow-up summary..." />
            <Field label="Duration (Mins)" name="duration_minutes" type="number" placeholder="15" />
            <Field label="Outcome" name="outcome" options={['', 'connected', 'no_answer', 'meeting_booked', 'rejected', 'interested', 'demo_booked']} />
            <Field label="Follow-up Date" name="due_on" type="date" />
            <div className="field"><SubmitButton>Log Touchpoint</SubmitButton></div>
          </form>
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Date</th><th>Kind</th><th>Notes & Discussion</th><th>Contact</th><th>Follow-up</th><th>By</th></tr>
              </thead>
              <tbody>
                {acts.length === 0 ? (
                  <tr><td colSpan={6} className="muted" style={{ padding: '24px', textAlign: 'center' }}>No activity logged yet.</td></tr>
                ) : (
                  acts.map((a) => (
                    <tr key={a.id}>
                      <td style={{ width: 90 }}>{d(a.created_at)}</td>
                      <td style={{ width: 90 }}>
                        <Tag v={a.kind} />
                        {a.duration_minutes ? <span className="muted" style={{ display: 'block', fontSize: 11 }}>{a.duration_minutes}m</span> : null}
                      </td>
                      <td>
                        {a.note}
                        {a.outcome && <span className="muted" style={{ marginLeft: 8 }}>[{a.outcome}]</span>}
                      </td>
                      <td>{a.contact_name ? <span>👤 {a.contact_name}</span> : '—'}</td>
                      <td className="muted">{a.due_on && !a.done_at ? `due ${d(a.due_on)}` : '—'}</td>
                      <td className="muted">{a.owner || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}
