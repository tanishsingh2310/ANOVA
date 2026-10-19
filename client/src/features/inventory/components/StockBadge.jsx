export default function StockBadge({ status }) {
  if (!status) return null;

  const styleMap = {
    IN_STOCK: { cls: 'inv-badge-success', dot: '●' },
    LOW_STOCK: { cls: 'inv-badge-warning', dot: '●' },
    CRITICAL: { cls: 'inv-badge-danger', dot: '●' },
    OUT_OF_STOCK: { cls: 'inv-badge-danger', dot: '●' },
    EXPIRED: { cls: 'inv-badge-danger', dot: '●' },
    EXPIRING_SOON: { cls: 'inv-badge-warning', dot: '●' },
    ACTIVE: { cls: 'inv-badge-success', dot: '●' },
    INACTIVE: { cls: 'inv-badge-neutral', dot: '●' },
    ORDERED: { cls: 'inv-badge-info', dot: '●' },
    RECEIVED: { cls: 'inv-badge-success', dot: '●' },
    PARTIALLY_RECEIVED: { cls: 'inv-badge-warning', dot: '●' },
    IN_TRANSIT: { cls: 'inv-badge-info', dot: '●' },
    SUBMITTED: { cls: 'inv-badge-warning', dot: '●' },
    DRAFT: { cls: 'inv-badge-neutral', dot: '●' },
    APPROVED: { cls: 'inv-badge-success', dot: '●' }
  };

  const key = typeof status === 'string' ? status : (status.level || 'IN_STOCK');
  const label = typeof status === 'string' ? status.replace(/_/g, ' ') : (status.text || key);
  const cfg = styleMap[key] || { cls: 'inv-badge-neutral', dot: '●' };

  return (
    <span className={`inv-badge ${cfg.cls}`}>
      <span className="inv-badge-dot">{cfg.dot}</span>
      <span>{label}</span>
    </span>
  );
}
