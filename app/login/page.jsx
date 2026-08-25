'use client'

import { useActionState } from 'react'
import { loginAction } from '../actions'
import { Field } from '../../components/ui'

export default function LoginPage() {
  const [error, action, pending] = useActionState(loginAction, null)
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)', padding: '24px' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', margin: 0, padding: 32, boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img
            src="/brand/school-grads-logo.svg"
            alt="School Grads"
            style={{ height: 48, width: 'auto', display: 'inline-block', marginBottom: 12, background: '#ffffff', padding: '4px 10px', borderRadius: 6 }}
          />
          <h1 style={{ fontSize: 20, margin: '8px 0 4px', color: 'var(--navy)' }}>School Grads Enterprise CRM</h1>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>Sign in to access your CRM workspace</p>
        </div>

        {error && <p className="err">{error}</p>}

        <form action={action}>
          <Field label="Email Address" name="email" type="email" wide required autoFocus placeholder="name@schoolgrads.ai" />
          <Field label="Password" name="password" type="password" wide required placeholder="••••••••" />
          <div style={{ marginTop: 16 }}>
            <button type="submit" disabled={pending} style={{ width: '100%', padding: '10px', fontSize: 14 }}>
              {pending ? 'Authenticating…' : 'Sign in to Portal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
