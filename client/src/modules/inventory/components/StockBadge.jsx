export default function StockBadge({ status }) {
  if (!status) return null;

  const styleMap = {
    IN_STOCK: { cls: 'inv-badge-success', icon: '●' },
    LOW_STOCK: { cls: 'inv-badge-warning', icon: '▲' },
    CRITICAL: { cls: 'inv-badge-danger', icon: '■' },
    OUT_OF_STOCK: { cls: 'inv-badge-danger', icon: '✕' },
    EXPIRED: { cls: 'inv-badge-danger', icon: '⚠️' },
    EXPIRING_SOON: { cls: 'inv-badge-warning', icon: '⏳' },
    ACTIVE: { cls: 'inv-badge-success', icon: '✓' },
    INACTIVE: { cls: 'inv-badge-neutral', icon: '○' },
    ORDERED: { cls: 'inv-badge-info', icon: '📦' },
    RECEIVED: { cls: 'inv-badge-success', icon: '✓' },
    PARTIALLY_RECEIVED: { cls: 'inv-badge-warning', icon: '◐' },
    IN_TRANSIT: { cls: 'inv-badge-info', icon: '🚚' },
    SUBMITTED: { cls: 'inv-badge-warning', icon: '⏱️' },
    DRAFT: { cls: 'inv-badge-neutral', icon: '📝' },
    APPROVED: { cls: 'inv-badge-success', icon: '👍' }
  };

  const key = typeof status === 'string' ? status : (status.level || 'IN_STOCK');
  const label = typeof status === 'string' ? status.replace(/_/g, ' ') : (status.text || key);
  const cfg = styleMap[key] || { cls: 'inv-badge-neutral', icon: '•' };

  return (
    <span className={`inv-badge ${cfg.cls}`}>
      <span style={{ fontSize: '9px' }}>{cfg.icon}</span>
      <span>{label}</span>
    </span>
  );
}
