'use client'

import { useState } from 'react'
import { Card, Field, Tag, KPICard } from '../../components/ui'
import { SubmitButton } from '../../components/submit'
import { saveEmployee, createUser, decideLeave, savePayslip, resetPassword } from './actions'
import { payslipTotals, statutoryAlerts } from '../../lib/payroll'

const ROLES = ['admin', 'sales', 'ops', 'finance', 'employee']

export default function PeopleClient({
  user,
  emps,
  leaves,
  slips,
  attendance,
  logins,
  isAddingEmp,
  isAddingUser,
  thisMonth
}) {
  const [activeTab, setActiveTab] = useState('directory')
  const [editingEmpId, setEditingEmpId] = useState(null)

  const pendingLeaves = leaves.filter((l) => l.status === 'pending')

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1>People & HR Management</h1>
          <p className="page-subtitle">Directory, payroll processing, statutory compliance, and leave approvals.</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setActiveTab('directory')
              window.location.href = isAddingUser ? '/people' : '/people?action=new_user'
            }}
          >
            {isAddingUser ? 'Close Login Form' : '+ Create Login User'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setActiveTab('directory')
              window.location.href = isAddingEmp ? '/people' : '/people?action=new_emp'
            }}
          >
            {isAddingEmp ? 'Close Employee Form' : '+ Add Employee'}
          </button>
        </div>
      </div>

      {statutoryAlerts(emps.length).map((a) => (
        <p className="err" key={a}>
          {a}
        </p>
      ))}

      {/* KPI Stats */}
      <div className="grid">
        <KPICard label="Total Active Team" value={emps.length} subtext="Employees on payroll" />
        <KPICard
          label="Pending Leave Requests"
          value={pendingLeaves.length}
          subtext="Awaiting review"
          trend={{ type: pendingLeaves.length > 0 ? 'down' : 'up', value: pendingLeaves.length > 0 ? 'Action Required' : 'Clear' }}
        />
        <KPICard label="System User Accounts" value={logins.length} subtext="Active portal logins" />
      </div>

      {/* Add Employee Form */}
      {isAddingEmp && (
        <Card title="Add New Team Member">
          <form action={saveEmployee}>
            <div className="row">
              <Field label="Full Name" name="name" required placeholder="Employee Name" />
              <Field label="Designation / Role" name="designation" placeholder="e.g. Senior Curriculum Lead" />
              <Field label="Date of Joining" name="doj" type="date" />
              <Field label="Annual CTC ₹" name="ctc" type="number" step="0.01" placeholder="600000" />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <a href="/people" className="btn ghost">
                Cancel
              </a>
              <SubmitButton>Add Employee Record</SubmitButton>
            </div>
          </form>
        </Card>
      )}

      {/* Create User Login Form */}
      {isAddingUser && (
        <Card title="Create Portal User Login">
          <form action={createUser}>
            <div className="row">
              <Field
                label="Link to Employee"
                name="employee_id"
                options={[['', '— Select Employee —'], ...emps.map((e) => [e.id, e.name])]}
              />
              <Field label="User Display Name" name="name" required placeholder="User Name" />
              <Field label="Email Address" name="email" type="email" required placeholder="user@schoolgrads.ai" />
              <Field label="Initial Password" name="password" type="password" minLength={8} required placeholder="Min 8 characters" />
              {user.role === 'admin' ? (
                <Field label="System Role" name="role" options={ROLES} />
              ) : (
                <div className="field">
                  <label>System Role</label>
                  <div className="muted" style={{ padding: '8px 0' }}>
                    employee (Only admin can assign higher roles)
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <a href="/people" className="btn ghost">
                Cancel
              </a>
              <SubmitButton>Create User Account</SubmitButton>
            </div>
          </form>
        </Card>
      )}

      {/* Underline Tabs */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          Employee Directory ({emps.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'leaves' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaves')}
        >
          Leave Management {pendingLeaves.length > 0 && <span className="tag overdue" style={{ marginLeft: 6 }}>{pendingLeaves.length}</span>}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'payroll' ? 'active' : ''}`}
          onClick={() => setActiveTab('payroll')}
        >
          Payroll & Payslips
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          User Accounts & Access ({logins.length})
        </button>
      </div>

      {/* Tab 1: Directory */}
      {activeTab === 'directory' && (
        <Card title={`Employee Directory (${emps.length})`}>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Designation</th>
                  <th>Date of Joining</th>
                  <th className="right">CTC ₹</th>
                  <th>PAN / Aadhaar</th>
                  <th>Bank Details</th>
                  <th>Portal Account</th>
                  <th className="right">Edit</th>
                </tr>
              </thead>
              <tbody>
                {emps.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="muted" style={{ padding: '24px', textAlign: 'center' }}>
                      No active employees found.
                    </td>
                  </tr>
                ) : (
                  emps.map((e) => {
                    const isEditing = editingEmpId === e.id
                    if (isEditing) {
                      return (
                        <tr key={e.id} style={{ background: 'var(--canvas)' }}>
                          <td colSpan={8} style={{ padding: '12px' }}>
                            <form action={saveEmployee}>
                              <input type="hidden" name="id" value={e.id} />
                              <div className="row" style={{ gap: 8 }}>
                                <Field label="Name" name="name" value={e.name} required />
                                <Field label="Designation" name="designation" value={e.designation} />
                                <Field label="DOJ" name="doj" type="date" value={e.doj ? new Date(e.doj).toISOString().slice(0, 10) : ''} />
                                <Field label="CTC ₹" name="ctc" type="number" step="0.01" value={e.ctc} />
                                <Field label="PAN" name="pan" value={e.pan} />
                                <Field label="Aadhaar" name="aadhaar" value={e.aadhaar} />
                                <Field label="Bank Account" name="bank_account" value={e.bank_account} />
                                <Field label="IFSC Code" name="bank_ifsc" value={e.bank_ifsc} />
                                <Field label="UAN" name="uan" value={e.uan} />
                                <Field label="ESIC No" name="esic_no" value={e.esic_no} />
                                <Field label="Emergency Contact" name="emergency_contact" value={e.emergency_contact} />
                              </div>
                              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn ghost" onClick={() => setEditingEmpId(null)}>
                                  Cancel
                                </button>
                                <SubmitButton>Save Employee</SubmitButton>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={e.id}>
                        <td>
                          <strong>{e.name}</strong>
                        </td>
                        <td>{e.designation || '—'}</td>
                        <td>{e.doj ? new Date(e.doj).toISOString().slice(0, 10) : '—'}</td>
                        <td className="right" style={{ fontWeight: 700 }}>
                          {e.ctc ? `₹${Number(e.ctc).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td>
                          <div style={{ fontSize: 12 }}>
                            {e.pan && <div>PAN: {e.pan}</div>}
                            {e.aadhaar && <div className="muted">Aadhaar: {e.aadhaar}</div>}
                            {!e.pan && !e.aadhaar && '—'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 12 }}>
                            {e.bank_account ? (
                              <>
                                <div>A/C: {e.bank_account}</div>
                                <div className="muted">{e.bank_ifsc}</div>
                              </>
                            ) : (
                              '—'
                            )}
                          </div>
                        </td>
                        <td>
                          {e.email ? (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 500 }}>{e.email}</div>
                              <span className="role-pill" style={{ fontSize: 9 }}>{e.role}</span>
                            </div>
                          ) : (
                            <span className="muted">No Account</span>
                          )}
                        </td>
                        <td className="right">
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => setEditingEmpId(e.id)}
                            style={{ padding: '3px 10px', fontSize: 12 }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Leaves */}
      {activeTab === 'leaves' && (
        <Card title={`Leave Management (${leaves.length})`}>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Leave Kind</th>
                  <th>Dates & Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="right">Action</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted" style={{ padding: '24px', textAlign: 'center' }}>
                      No leave requests submitted.
                    </td>
                  </tr>
                ) : (
                  leaves.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <strong>{l.name}</strong>
                      </td>
                      <td>
                        <Tag v={l.kind} />
                      </td>
                      <td>
                        {l.from_on ? new Date(l.from_on).toISOString().slice(0, 10) : ''} → {l.to_on ? new Date(l.to_on).toISOString().slice(0, 10) : ''} ({Number(l.days)}d)
                      </td>
                      <td>{l.reason || '—'}</td>
                      <td>
                        <Tag v={l.status} />
                      </td>
                      <td className="right">
                        {l.status === 'pending' && (
                          <form action={decideLeave} style={{ display: 'inline-flex', gap: 6 }}>
                            <input type="hidden" name="id" value={l.id} />
                            <button name="status" value="approved" type="submit" style={{ padding: '4px 10px', fontSize: 12 }}>
                              Approve
                            </button>
                            <button className="danger" name="status" value="rejected" type="submit">
                              Reject
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Payroll */}
      {activeTab === 'payroll' && (
        <>
          <Card title="Run Monthly Payslip">
            <form action={savePayslip}>
              <div className="row">
                <Field label="Employee" name="employee_id" options={emps.map((e) => [e.id, e.name])} required />
                <Field label="Pay Period Month" name="period" type="month" value={thisMonth} required />
                <Field label="Basic ₹" name="basic" type="number" step="0.01" required placeholder="30000" />
                <Field label="HRA ₹" name="hra" type="number" step="0.01" placeholder="15000" />
                <Field label="Allowances ₹" name="allowances" type="number" step="0.01" placeholder="5000" />
                <Field label="PT ₹ (Blank = Auto)" name="pt" type="number" step="0.01" />
                <Field label="TDS ₹" name="tds" type="number" step="0.01" />
                <Field label="Other Deductions ₹" name="other_deductions" type="number" step="0.01" />
              </div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <SubmitButton>Process Payslip</SubmitButton>
              </div>
            </form>
          </Card>

          <Card title={`Payslip Register (${slips.length})`}>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Pay Period</th>
                    <th>Employee Name</th>
                    <th className="right">Gross Salary</th>
                    <th className="right">PT</th>
                    <th className="right">TDS</th>
                    <th className="right">Net Salary</th>
                    <th className="right">Statement</th>
                  </tr>
                </thead>
                <tbody>
                  {slips.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="muted" style={{ padding: '24px', textAlign: 'center' }}>
                        No payslips generated yet.
                      </td>
                    </tr>
                  ) : (
                    slips.map((p) => {
                      const t = payslipTotals(p)
                      return (
                        <tr key={p.id}>
                          <td>{p.period ? new Date(p.period).toISOString().slice(0, 7) : ''}</td>
                          <td>
                            <strong>{p.name}</strong>
                          </td>
                          <td className="right">₹{Number(t.gross).toLocaleString('en-IN')}</td>
                          <td className="right">₹{Number(p.pt).toLocaleString('en-IN')}</td>
                          <td className="right">₹{Number(p.tds).toLocaleString('en-IN')}</td>
                          <td className="right" style={{ fontWeight: 700, color: 'var(--good-fg)' }}>
                            ₹{Number(t.net).toLocaleString('en-IN')}
                          </td>
                          <td className="right">
                            <a href={`/people/payslip/${p.id}`} className="btn ghost" style={{ padding: '3px 8px', fontSize: 11 }}>
                              View Statement →
                            </a>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Attendance Check-Ins (Last 7 Days)">
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee Name</th>
                    <th>Check In Time</th>
                    <th>Check Out Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted" style={{ padding: '16px' }}>
                        No attendance records logged.
                      </td>
                    </tr>
                  ) : (
                    attendance.map((a) => (
                      <tr key={a.id}>
                        <td>{a.on_date ? new Date(a.on_date).toISOString().slice(0, 10) : ''}</td>
                        <td>
                          <strong>{a.name}</strong>
                        </td>
                        <td>{a.check_in ? new Date(a.check_in).toLocaleTimeString('en-IN') : '—'}</td>
                        <td>{a.check_out ? new Date(a.check_out).toLocaleTimeString('en-IN') : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Tab 4: Security */}
      {activeTab === 'security' && (
        <>
          <Card title={`Active User Logins (${logins.length})`}>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Display Name</th>
                    <th>Email Address</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {logins.map((u) => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td>
                        <strong>{u.name}</strong>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className="role-pill">{u.role}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {user.role === 'admin' && (
            <Card title="Admin Password Reset Tool">
              <p className="muted" style={{ marginBottom: 12 }}>
                Reset password for any user account. Inform employee in person.
              </p>
              <form action={resetPassword}>
                <div className="row">
                  <Field
                    label="Select User Account"
                    name="user_id"
                    options={logins.map((u) => [u.id, `${u.email} (${u.role})`])}
                    required
                  />
                  <Field label="New Password (Min 8 Chars)" name="password" type="password" minLength={8} required />
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <SubmitButton className="ghost">Reset Password</SubmitButton>
                </div>
              </form>
            </Card>
          )}
        </>
      )}
    </>
  )
}
