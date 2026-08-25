'use client'

export function Drawer({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <div className={`drawer-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2 style={{ margin: 0, fontSize: '16px' }}>{title}</h2>
          <button
            type="button"
            className="ghost"
            style={{ padding: '4px 8px', fontSize: '14px', border: 0 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  )
}
