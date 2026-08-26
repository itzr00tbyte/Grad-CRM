export default function NotFound() {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 24
    }}>
      <div className="card" style={{ maxWidth: 460, padding: 36 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <h1 style={{ fontSize: 24, margin: '0 0 8px', color: 'var(--navy)' }}>Page Not Found</h1>
        <p className="muted" style={{ fontSize: 14, margin: '0 0 24px' }}>
          The school, lead, deal, or page you were looking for doesn't exist or has been relocated.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <a href="/" className="btn">
            Back to Dashboard
          </a>
          <a href="/schools" className="btn ghost">
            Browse Schools
          </a>
        </div>
      </div>
    </div>
  )
}
