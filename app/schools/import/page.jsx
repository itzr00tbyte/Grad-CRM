import { requireUser } from '../../../lib/auth'
import { Card } from '../../../components/ui'
import { SubmitButton } from '../../../components/submit'
import { importLeads } from './actions'

export default async function ImportLeadsPage({ searchParams }) {
  await requireUser('schools')
  const sp = await searchParams
  const err = sp?.err
  const success = sp?.success
  
  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="/schools" className="muted" style={{ fontSize: 13 }}>
              ← Schools
            </a>
          </div>
          <h1 style={{ marginTop: 4 }}>Bulk Import Leads & Schools</h1>
          <p className="page-subtitle">Upload CSV file to import multiple school records at once.</p>
        </div>
      </div>
      
      {err && <p className="err">{err}</p>}
      {success && (
        <div style={{ background: 'var(--good-bg)', color: 'var(--good-fg)', padding: '12px 16px', borderRadius: 'var(--r-sm)', marginBottom: 16, fontWeight: 600 }}>
          {success}
        </div>
      )}

      <Card title="Upload CSV File">
        <p className="muted" style={{ marginBottom: 16 }}>
          Upload a CSV file containing school details. Columns will be automatically mapped. 
          <br />
          <a href="/schools/import/template.csv" style={{ fontWeight: 600, color: 'var(--blue)', display: 'inline-block', marginTop: 6 }}>
            ↓ Download CSV Template File
          </a>
        </p>

        <form action={importLeads} className="row">
          <div className="field wide">
            <label>Select CSV File *</label>
            <input
              type="file"
              name="file"
              accept=".csv"
              required
              style={{ border: '1px solid var(--line)', padding: '8px', borderRadius: 'var(--r-sm)', background: 'var(--canvas)' }}
            />
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end' }}>
            <a href="/schools" className="btn ghost">Cancel</a>
            <SubmitButton>Upload and Import</SubmitButton>
          </div>
        </form>
      </Card>
    </>
  )
}
