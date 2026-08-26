'use client'

import { useEffect } from 'react'

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled app error:', error)
  }, [error])

  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 24
    }}>
      <div className="card" style={{ maxWidth: 500, padding: 36, border: '1px solid var(--bad-fg)' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
        <h1 style={{ fontSize: 22, margin: '0 0 8px', color: 'var(--navy)' }}>Something went wrong</h1>
        <p className="muted" style={{ fontSize: 13, margin: '0 0 16px' }}>
          An unexpected error occurred while processing your request.
        </p>
        {error?.message && (
          <div style={{
            background: 'var(--bad-bg)',
            color: 'var(--bad-fg)',
            padding: '8px 12px',
            borderRadius: 'var(--r-sm)',
            fontSize: 12,
            fontFamily: 'monospace',
            marginBottom: 20,
            textAlign: 'left',
            overflowX: 'auto'
          }}>
            {error.message}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button type="button" onClick={() => reset()} className="btn">
            Try Again
          </button>
          <a href="/" className="btn ghost">
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
