/** Reusable Enterprise UI components and helper tags. */

import { KPICard } from './ui/KPICard'
import { Drawer } from './ui/Drawer'
import { SearchableSelect } from './ui/SearchableSelect'

export { KPICard, Drawer, SearchableSelect }

export function Field({ label, name, type = 'text', options, wide, value, placeholder, required, ...rest }) {
  const id = `f_${name}`
  return (
    <div className={wide ? 'field wide' : 'field'}>
      {label && <label htmlFor={id}>{label}{required && <span style={{ color: 'var(--bad-fg)', marginLeft: 2 }}>*</span>}</label>}
      {options ? (
        <select id={id} name={name} defaultValue={value ?? ''} required={required} {...rest}>
          {options.map((o) => {
            const [v, t] = Array.isArray(o) ? o : [o, o]
            return (
              <option key={v} value={v}>
                {t}
              </option>
            )
          })}
        </select>
      ) : type === 'textarea' ? (
        <textarea id={id} name={name} defaultValue={value ?? ''} placeholder={placeholder} required={required} {...rest} />
      ) : (
        <input id={id} name={name} type={type} defaultValue={value ?? ''} placeholder={placeholder} required={required} {...rest} />
      )}
    </div>
  )
}

export function Card({ title, children, actions, className }) {
  return (
    <section className={`card ${className || ''}`}>
      {(title || actions) && (
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          {title && <h2 style={{ margin: 0 }}>{title}</h2>}
          {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export const Tag = ({ v }) => <span className={`tag ${v || ''}`}>{v || '—'}</span>

export const STAGES = ['inquiry', 'demo', 'pilot', 'proposal', 'negotiation', 'won', 'lost']
export const STATUSES = ['lead', 'pilot', 'active', 'renewal', 'churned']
export const BOARDS = ['', 'CBSE', 'ICSE', 'IGCSE', 'IB', 'State']
export const ROLE_TAGS = ['founder', 'principal', 'coordinator', 'accounts', 'other']
