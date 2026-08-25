export function KPICard({ label, value, subtext, trend, action }) {
  return (
    <div className="kpi-card">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="kpi-label">{label}</span>
          {trend && (
            <span
              className={`tag ${
                trend.type === 'up' ? 'won' : trend.type === 'down' ? 'lost' : 'pending'
              }`}
              style={{ fontSize: '10px', padding: '1px 6px' }}
            >
              {trend.value}
            </span>
          )}
        </div>
        <div className="kpi-value">{value}</div>
      </div>
      {subtext && <div className="kpi-subtext">{subtext}</div>}
      {action && <div style={{ marginTop: '10px' }}>{action}</div>}
    </div>
  )
}
