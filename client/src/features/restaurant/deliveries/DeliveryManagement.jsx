import { useState, useEffect, useMemo } from 'react'
import {
  Truck,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Search,
  AlertCircle,
  MapPin,
  Phone,
  User as UserIcon,
  ShoppingBag,
  ShieldCheck,
} from 'lucide-react'
import { apiRequest } from '../../../services/api'
import '../../../styles/deliveries.css'

const ALL_BRANCHES = 'all'

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBranchAddress(addr) {
  if (!addr) return ''
  if (typeof addr === 'string') return addr
  if (typeof addr === 'object') {
    const parts = [addr.street, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean)
    return parts.join(', ')
  }
  return ''
}

function extractAddress(notes) {
  if (!notes) return 'Customer requested delivery'
  if (typeof notes === 'object') {
    return [notes.line1 || notes.street, notes.city, notes.postalCode].filter(Boolean).join(', ')
  }
  const match = String(notes).match(/Delivery to:\s*([^|]+)/i)
  if (match && match[1]) {
    return match[1].trim()
  }
  return String(notes)
}

function extractInstructions(notes) {
  if (!notes || typeof notes === 'object') return null
  const match = String(notes).match(/Note:\s*(.+)/i)
  if (match && match[1]) {
    return match[1].trim()
  }
  return null
}

export default function DeliveryManagement({
  user,
  branchId = ALL_BRANCHES,
  branches = [],
  onBranchChange,
}) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // 'active', 'out-for-delivery', 'ready', 'completed', 'all'
  const [searchQuery, setSearchQuery] = useState('')
  const [notice, setNotice] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const isDeliveryPersonnel = user?.role === 'delivery_personnel'
  const userBranchId = user?.branch
    ? typeof user.branch === 'object'
      ? String(user.branch._id || user.branch.id)
      : String(user.branch)
    : null

  // Resolve the best branch to query for
  const effectiveBranchId = useMemo(() => {
    // If delivery personnel, strictly enforce their assigned branch
    if (isDeliveryPersonnel) {
      if (userBranchId) return userBranchId
      if (branchId && branchId !== ALL_BRANCHES) return String(branchId)
      if (branches.length > 0) return String(branches[0]._id || branches[0].id)
    }
    if (branchId && branchId !== ALL_BRANCHES) {
      return String(branchId)
    }
    return ALL_BRANCHES
  }, [branchId, branches, isDeliveryPersonnel, userBranchId])

  const notify = (type, message) => {
    setNotice({ type, message })
    setTimeout(() => setNotice(null), 5000)
  }

  // Load deliveries
  useEffect(() => {
    let active = true
    setLoading(true)

    async function fetchDeliveries() {
      try {
        let rawOrders = []

        if (effectiveBranchId && effectiveBranchId !== ALL_BRANCHES) {
          const res = await apiRequest(`/api/orders/${effectiveBranchId}`)
          const data = res?.data ?? res?.orders ?? res
          rawOrders = Array.isArray(data) ? data : []
        } else if (branches.length > 0) {
          const results = await Promise.allSettled(
            branches.map((b) => apiRequest(`/api/orders/${b._id || b.id}`))
          )
          rawOrders = results
            .filter((r) => r.status === 'fulfilled')
            .flatMap((r) => {
              const d = r.value?.data ?? r.value?.orders ?? r.value
              return Array.isArray(d) ? d : []
            })
        }

        const deliveryOnly = rawOrders.filter(
          (o) =>
            String(o?.orderType || '').toLowerCase() === 'delivery' ||
            ['Out for Delivery', 'Ready', 'Delivered'].includes(o?.status)
        )

        if (active) {
          setOrders(deliveryOnly)
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to load delivery orders:', err)
        if (active) {
          notify('error', err.message || 'Unable to load delivery orders.')
          setLoading(false)
        }
      }
    }

    fetchDeliveries()

    return () => {
      active = false
    }
  }, [effectiveBranchId, branches, refreshKey])

  // Listen to background updates
  useEffect(() => {
    const handleUpdate = (e) => {
      const endpoint = e.detail?.endpoint || ''
      if (endpoint.includes('/orders')) {
        setRefreshKey((k) => k + 1)
      }
    }
    window.addEventListener('anova_records_updated', handleUpdate)
    return () => window.removeEventListener('anova_records_updated', handleUpdate)
  }, [])

  // Mark order status
  const updateDeliveryStatus = async (order, targetStatus) => {
    const orderId = order._id || order.id
    const bId =
      order.branchId ||
      order.branch?._id ||
      order.branch ||
      (effectiveBranchId !== ALL_BRANCHES ? effectiveBranchId : null)

    if (!bId) {
      notify('error', 'Cannot update order: missing branch identifier.')
      return
    }

    setUpdatingId(orderId)
    try {
      const payload = {
        status: targetStatus,
        deliveryStaff: user?.id,
        deliveryStaffName: user?.name,
      }

      await apiRequest(`/api/orders/${bId}/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      // Update local state immediately
      setOrders((prev) =>
        prev.map((o) =>
          (o._id || o.id) === orderId
            ? {
                ...o,
                status: targetStatus,
                deliveryStaff: user?.id,
                deliveryStaffName: user?.name,
              }
            : o
        )
      )

      if (targetStatus === 'Completed') {
        notify('success', `Order #${order.orderNumber} successfully marked as Complete & Delivered!`)
      } else if (targetStatus === 'Out for Delivery') {
        notify('success', `Order #${order.orderNumber} is now Out for Delivery!`)
      } else {
        notify('success', `Order status updated to ${targetStatus}`)
      }
    } catch (err) {
      notify('error', err.message || 'Failed to update delivery status.')
    } finally {
      setUpdatingId(null)
    }
  }

  // Calculate Metrics
  const metrics = useMemo(() => {
    const outForDelivery = orders.filter((o) => o?.status === 'Out for Delivery').length
    const ready = orders.filter((o) => o?.status === 'Ready').length
    const completed = orders.filter((o) => ['Completed', 'Delivered'].includes(o?.status)).length
    return {
      active: outForDelivery + ready,
      outForDelivery,
      ready,
      completed,
      total: orders.length,
    }
  }, [orders])

  // Filter & Search
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === 'active' && !['Out for Delivery', 'Ready', 'Preparing'].includes(order?.status)) {
        return false
      }
      if (activeTab === 'out-for-delivery' && order?.status !== 'Out for Delivery') {
        return false
      }
      if (activeTab === 'ready' && order?.status !== 'Ready') {
        return false
      }
      if (activeTab === 'completed' && !['Completed', 'Delivered'].includes(order?.status)) {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const orderNum = String(order?.orderNumber || '').toLowerCase()
        const custName = String(order?.customerName || order?.customer?.name || '').toLowerCase()
        const notes = String(order?.notes || '').toLowerCase()
        const branchName = String(order?.branch?.name || '').toLowerCase()

        if (
          !orderNum.includes(query) &&
          !custName.includes(query) &&
          !notes.includes(query) &&
          !branchName.includes(query)
        ) {
          return false
        }
      }

      return true
    })
  }, [orders, activeTab, searchQuery])

  const currentBranchLabel = useMemo(() => {
    if (effectiveBranchId === ALL_BRANCHES) {
      return 'All Branches'
    }
    const found = branches.find((b) => String(b._id || b.id) === String(effectiveBranchId))
    return found?.name || 'Selected Branch'
  }, [effectiveBranchId, branches])

  return (
    <div className="deliveries-management">
      {/* Header */}
      <header className="deliveries-header">
        <div className="deliveries-header-info">
          <h2>
            <Truck size={24} />
            <span>Delivery Management</span>
          </h2>
          <p>
            <span style={{ fontWeight: 600, color: 'var(--deliv-primary)' }}>
              📍 {currentBranchLabel}:{' '}
            </span>
            View assigned delivery orders, accept ready food packages, and complete customer drop-offs.
          </p>
        </div>

        <div className="deliveries-header-controls">
          {!isDeliveryPersonnel && branches.length > 0 && (
            <select
              className="deliveries-select"
              value={effectiveBranchId}
              onChange={(e) => onBranchChange?.(e.target.value)}
              aria-label="Filter deliveries by branch"
            >
              <option value={ALL_BRANCHES}>All Branches</option>
              {branches.map((b) => (
                <option key={b._id || b.id} value={b._id || b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="deliveries-btn-refresh"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            title="Refresh Deliveries"
          >
            <RefreshCw size={15} className={loading ? 'deliveries-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Alert Notice */}
      {notice && (
        <div className={`deliveries-alert deliveries-alert-${notice.type}`} role="alert">
          {notice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Metrics Row */}
      <section className="deliveries-metrics" aria-label="Delivery performance summary">
        <div className="deliveries-metric-card">
          <div className="deliveries-metric-info">
            <span className="deliveries-metric-title">Out for Delivery</span>
            <span className="deliveries-metric-value">{metrics.outForDelivery}</span>
          </div>
          <div className="deliveries-metric-icon out">
            <Truck size={22} />
          </div>
        </div>

        <div className="deliveries-metric-card">
          <div className="deliveries-metric-info">
            <span className="deliveries-metric-title">Ready for Pickup</span>
            <span className="deliveries-metric-value">{metrics.ready}</span>
          </div>
          <div className="deliveries-metric-icon active">
            <Clock3 size={22} />
          </div>
        </div>

        <div className="deliveries-metric-card">
          <div className="deliveries-metric-info">
            <span className="deliveries-metric-title">Completed Today</span>
            <span className="deliveries-metric-value">{metrics.completed}</span>
          </div>
          <div className="deliveries-metric-icon completed">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="deliveries-metric-card">
          <div className="deliveries-metric-info">
            <span className="deliveries-metric-title">Total Delivery Orders</span>
            <span className="deliveries-metric-value">{metrics.total}</span>
          </div>
          <div className="deliveries-metric-icon all">
            <ShoppingBag size={22} />
          </div>
        </div>
      </section>

      {/* Filter Tabs & Search Toolbar */}
      <div className="deliveries-toolbar">
        <div className="deliveries-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`deliveries-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>All</span>
            <span className="deliveries-tab-count">{metrics.total}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'out-for-delivery'}
            className={`deliveries-tab ${activeTab === 'out-for-delivery' ? 'active' : ''}`}
            onClick={() => setActiveTab('out-for-delivery')}
          >
            <span>Out for Delivery</span>
            <span className="deliveries-tab-count">{metrics.outForDelivery}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ready'}
            className={`deliveries-tab ${activeTab === 'ready' ? 'active' : ''}`}
            onClick={() => setActiveTab('ready')}
          >
            <span>Ready for Pickup</span>
            <span className="deliveries-tab-count">{metrics.ready}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'completed'}
            className={`deliveries-tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <span>Completed</span>
            <span className="deliveries-tab-count">{metrics.completed}</span>
          </button>
        </div>

        <div className="deliveries-search-box">
          <Search size={15} className="deliveries-search-icon" />
          <input
            type="text"
            className="deliveries-search-input"
            placeholder="Search order #, customer, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Grid */}
      {loading && orders.length === 0 ? (
        <div className="deliveries-empty-state">
          <LoaderCircle size={32} className="deliveries-spin" style={{ color: 'var(--deliv-primary)' }} />
          <p style={{ marginTop: '0.75rem' }}>Loading delivery orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="deliveries-empty-state">
          <div className="deliveries-empty-icon">📦</div>
          <h3>No delivery orders found</h3>
          <p>
            {activeTab === 'out-for-delivery'
              ? 'There are currently no orders in transit. Pick up a ready order to begin delivery.'
              : activeTab === 'ready'
              ? 'No orders are currently waiting for pickup. The kitchen will mark orders ready when food is prepared.'
              : activeTab === 'completed'
              ? 'No completed delivery orders recorded in this view.'
              : 'No delivery orders match your current filters.'}
          </p>
        </div>
      ) : (
        <div className="deliveries-grid">
          {filteredOrders.map((order) => {
            const orderId = order?._id || order?.id
            const isUpdating = updatingId === orderId
            const statusKey = String(order?.status || 'pending').toLowerCase().replace(/\s+/g, '-')
            const addressText = extractAddress(order?.notes)
            const instructions = extractInstructions(order?.notes)
            const customerName = order?.customerName || order?.customer?.name || 'Customer'
            const customerPhone = order?.customer?.phone
            const branchName = order?.branch?.name || currentBranchLabel || 'ANOVA Restaurant'
            const isOutForDelivery = order?.status === 'Out for Delivery'
            const isReady = order?.status === 'Ready'
            const isCompleted = ['Completed', 'Delivered'].includes(order?.status)

            return (
              <article key={orderId} className={`deliveries-card status-${statusKey}`}>
                {/* Header */}
                <div className="deliveries-card-header">
                  <div>
                    <div className="deliveries-order-num">
                      <Truck size={16} />
                      <span>Order #{order?.orderNumber || String(orderId).slice(-6).toUpperCase()}</span>
                    </div>
                    <span className="deliveries-order-time">{formatDate(order?.createdAt)}</span>
                  </div>

                  <span className={`deliveries-badge status-${statusKey}`}>
                    {order?.status}
                  </span>
                </div>

                {/* Body */}
                <div className="deliveries-card-body">
                  {/* Branch pickup location */}
                  <div className="deliveries-info-row">
                    <MapPin size={17} className="deliveries-info-icon" style={{ color: '#0369a1' }} />
                    <div className="deliveries-info-content">
                      <div className="deliveries-info-title">Pick Up From</div>
                      <strong>{branchName}</strong>
                      {order?.branch?.address && (
                        <div style={{ color: 'var(--deliv-muted)', fontSize: '0.8rem' }}>
                          {formatBranchAddress(order.branch.address)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Drop-off */}
                  <div className="deliveries-info-row">
                    <UserIcon size={17} className="deliveries-info-icon" />
                    <div className="deliveries-info-content">
                      <div className="deliveries-info-title">Deliver To</div>
                      <span className="deliveries-customer-name">{customerName}</span>
                      {customerPhone && (
                        <div>
                          <a href={`tel:${customerPhone}`} className="deliveries-customer-phone">
                            <Phone size={12} />
                            <span>{customerPhone}</span>
                          </a>
                        </div>
                      )}
                      <div className="deliveries-address-box" style={{ marginTop: '0.35rem' }}>
                        {addressText}
                      </div>
                      {instructions && (
                        <div style={{ fontSize: '0.78rem', color: '#854d0e', marginTop: '0.25rem' }}>
                          <strong>Note:</strong> {instructions}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="deliveries-items-section">
                    <div className="deliveries-items-header">
                      <span>Order Items</span>
                      <span>{(order?.items || []).length} item(s)</span>
                    </div>
                    {(order?.items || []).map((item, idx) => (
                      <div key={idx} className="deliveries-item-row">
                        <span className="deliveries-item-name">
                          {item?.quantity}x {item?.name || item?.menuItemId?.name || 'Dish'}
                        </span>
                        <span>{formatCurrency((item?.price || 0) * (item?.quantity || 1))}</span>
                      </div>
                    ))}
                  </div>

                  {/* Rider assignment */}
                  {(order?.deliveryStaffName || order?.deliveryStaff?.name) && (
                    <div className="deliveries-rider-tag">
                      <ShieldCheck size={13} />
                      <span>Rider: {order.deliveryStaffName || order.deliveryStaff?.name}</span>
                    </div>
                  )}
                </div>

                {/* Footer & Actions */}
                <div className="deliveries-card-footer">
                  <div className="deliveries-total-group">
                    <span className="deliveries-total-label">Order Total</span>
                    <span className="deliveries-total-val">
                      {formatCurrency(order?.total ?? order?.totalAmount ?? 0)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div>
                    {isReady && (
                      <button
                        type="button"
                        className="deliveries-action-btn deliveries-action-pickup"
                        disabled={isUpdating}
                        onClick={() => updateDeliveryStatus(order, 'Out for Delivery')}
                      >
                        {isUpdating ? (
                          <LoaderCircle size={15} className="deliveries-spin" />
                        ) : (
                          <Truck size={15} />
                        )}
                        <span>Take Order & Start Delivery</span>
                      </button>
                    )}

                    {isOutForDelivery && (
                      <button
                        type="button"
                        className="deliveries-action-btn deliveries-action-complete"
                        disabled={isUpdating}
                        onClick={() => updateDeliveryStatus(order, 'Completed')}
                      >
                        {isUpdating ? (
                          <LoaderCircle size={15} className="deliveries-spin" />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}
                        <span>Mark as Complete</span>
                      </button>
                    )}

                    {isCompleted && (
                      <div className="deliveries-completed-badge">
                        <CheckCircle2 size={14} />
                        <span>Completed</span>
                      </div>
                    )}

                    {!isReady && !isOutForDelivery && !isCompleted && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--deliv-muted)' }}>
                        Kitchen: {order?.status}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
