import { useEffect, useState, useMemo } from 'react'
import { apiClient } from '../../api/client.js'
import Logo1 from '../../assets/Logo1.png'
import banner from '../../assets/banner.png'
import './customer.css'

function formatPrice(price) {
  const amount = Number(price)
  if (!Number.isFinite(amount)) return '₹0.00'

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatAddress(address) {
  if (!address) return ''
  if (typeof address === 'string') return address

  return [
    address.street || address.line1,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(', ')
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

const customerNavigation = [
  { label: 'Overview', icon: '◫' },
  { label: 'Branches', icon: '⌂' },
  { label: 'Menu', icon: '🍽' },
  { label: 'My Orders', icon: '🛍' },
  { label: 'Offers', icon: '🏷' },
  { label: 'Feedback', icon: '★' },
  { label: 'Profile', icon: '👤' },
]

export default function CustomerHome({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('Overview')
  const [mobileMenu, setMobileMenu] = useState(false)

  // Data states
  const [branches, setBranches] = useState([])
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [branchesError, setBranchesError] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState('')

  const [menuItems, setMenuItems] = useState([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuError, setMenuError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [menuSearch, setMenuSearch] = useState('')
  const [dietaryFilter, setDietaryFilter] = useState('All')

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')

  const [offers, setOffers] = useState([])
  const [offersLoading, setOffersLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState('')

  const [customerProfile, setCustomerProfile] = useState(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')

  // Address form states
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [addressForm, setAddressForm] = useState({
    label: 'home',
    line1: '',
    city: '',
    postalCode: '',
    isDefault: false,
  })

  // Feedback states
  const [feedbackTab, setFeedbackTab] = useState('review') // 'review' | 'complaint' | 'history'
  const [rating, setRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewOrder, setReviewOrder] = useState('')
  const [complaintSubject, setComplaintSubject] = useState('')
  const [complaintDesc, setComplaintDesc] = useState('')
  const [complaintCategory, setComplaintCategory] = useState('food_quality')
  const [feedbackSuccess, setFeedbackSuccess] = useState('')
  const [feedbackError, setFeedbackError] = useState('')
  const [pastReviews, setPastReviews] = useState([])
  const [pastComplaints, setPastComplaints] = useState([])

  // Cart & Checkout states
  const [cart, setCart] = useState([])
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [orderType, setOrderType] = useState('Delivery')
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [couponMessage, setCouponMessage] = useState('')
  const [orderPlacing, setOrderPlacing] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [orderSuccessData, setOrderSuccessData] = useState(null)

  const displayName = user?.name || user?.email?.split('@')[0] || 'Customer'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'C'

  // Load Branches
  useEffect(() => {
    let cancelled = false
    async function loadBranches() {
      setBranchesLoading(true)
      setBranchesError('')
      try {
        const response = await apiClient('/api/branches/public')
        const available = Array.isArray(response?.branches)
          ? response.branches
          : []
        if (cancelled) return
        setBranches(available)
        if (available.length > 0 && !selectedBranchId) {
          // Default to Pune branch because it contains the active menu items in the database
          const pune = available.find(
            (b) =>
              b.name?.toLowerCase().includes('pune') ||
              b._id === '6ad0e90a53cc462cbaaec9fa',
          )
          setSelectedBranchId(pune ? pune._id : available[0]._id)
        }
      } catch (err) {
        if (!cancelled) {
          setBranchesError(err.message || 'Unable to load restaurant locations.')
        }
      } finally {
        if (!cancelled) setBranchesLoading(false)
      }
    }
    loadBranches()
    return () => {
      cancelled = true
    }
  }, [])

  // Load Menu when branch changes
  useEffect(() => {
    if (!selectedBranchId) return
    let cancelled = false
    async function loadMenu() {
      setMenuLoading(true)
      setMenuError('')
      try {
        const response = await apiClient(
          `/api/menu/${encodeURIComponent(selectedBranchId)}`,
        )
        if (cancelled) return
        if (Array.isArray(response)) {
          setMenuItems(response)
        } else if (Array.isArray(response?.data)) {
          setMenuItems(response.data)
        } else {
          setMenuItems([])
        }
      } catch (err) {
        if (!cancelled) {
          setMenuError(err.message || 'Unable to load menu for this branch.')
        }
      } finally {
        if (!cancelled) setMenuLoading(false)
      }
    }
    loadMenu()
    return () => {
      cancelled = true
    }
  }, [selectedBranchId])

  // Load Customer Profile
  const loadProfile = async () => {
    try {
      const res = await apiClient('/api/customers/me')
      const data = res?.data || res
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setCustomerProfile(data)
        if (data.phone) setPhoneInput(data.phone)
      }
    } catch (err) {
      console.warn('Customer profile load notice:', err.message)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [activeTab])

  // Load Orders
  useEffect(() => {
    if (activeTab !== 'My Orders' && activeTab !== 'Overview') return
    let cancelled = false
    async function loadOrders() {
      setOrdersLoading(true)
      setOrdersError('')
      try {
        const res = await apiClient('/api/orders/my')
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        if (!cancelled) setOrders(list)
      } catch (err) {
        if (!cancelled) {
          setOrdersError(err.message || 'Unable to fetch your order history.')
        }
      } finally {
        if (!cancelled) setOrdersLoading(false)
      }
    }
    loadOrders()
    return () => {
      cancelled = true
    }
  }, [activeTab])

  // Load Offers
  useEffect(() => {
    if (activeTab !== 'Offers' && activeTab !== 'Overview') return
    let cancelled = false
    async function loadOffers() {
      setOffersLoading(true)
      try {
        const res = await apiClient('/api/coupons/offers')
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        if (!cancelled) {
          if (list.length > 0) {
            setOffers(list)
          } else {
            // Elegant default offers
            setOffers([
              {
                _id: '1',
                code: 'WELCOME25',
                discountPercent: 25,
                description: '25% off on your first dine-in or takeaway reservation.',
                minOrder: 500,
                expiresAt: '2026-12-31',
              },
              {
                _id: '2',
                code: 'ANOVAGOURMET',
                discountAmount: 150,
                description: 'Flat ₹150 discount on premium chef selections over ₹800.',
                minOrder: 800,
                expiresAt: '2026-11-30',
              },
              {
                _id: '3',
                code: 'WEEKENDLUX',
                discountPercent: 15,
                description: '15% savings across all weekend dinner experiences.',
                minOrder: 1000,
                expiresAt: '2026-12-15',
              },
            ])
          }
        }
      } catch {
        if (!cancelled) {
          setOffers([
            {
              _id: '1',
              code: 'WELCOME25',
              discountPercent: 25,
              description: '25% off on your first dine-in or takeaway order.',
              minOrder: 500,
              expiresAt: '2026-12-31',
            },
            {
              _id: '2',
              code: 'ANOVAGOURMET',
              discountAmount: 150,
              description: 'Flat ₹150 discount on orders over ₹800.',
              minOrder: 800,
              expiresAt: '2026-11-30',
            },
          ])
        }
      } finally {
        if (!cancelled) setOffersLoading(false)
      }
    }
    loadOffers()
    return () => {
      cancelled = true
    }
  }, [activeTab])

  // Load Past Feedback & Reviews
  useEffect(() => {
    if (activeTab !== 'Feedback') return
    async function loadFeedbackHistory() {
      try {
        const [revRes, compRes] = await Promise.allSettled([
          apiClient('/api/reviews/mine'),
          apiClient('/api/complaints/mine'),
        ])
        if (revRes.status === 'fulfilled') {
          const list = Array.isArray(revRes.value?.data)
            ? revRes.value.data
            : Array.isArray(revRes.value)
            ? revRes.value
            : []
          setPastReviews(list)
        }
        if (compRes.status === 'fulfilled') {
          const list = Array.isArray(compRes.value?.data)
            ? compRes.value.data
            : Array.isArray(compRes.value)
            ? compRes.value
            : []
          setPastComplaints(list)
        }
      } catch (err) {
        console.warn('Feedback history load notice:', err.message)
      }
    }
    loadFeedbackHistory()
  }, [activeTab])

  // Derived categories from menu items
  const categories = useMemo(() => {
    const set = new Set(['All'])
    menuItems.forEach((item) => {
      if (item.category) set.add(item.category)
    })
    return Array.from(set)
  }, [menuItems])

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat =
        selectedCategory === 'All' || item.category === selectedCategory
      const matchSearch =
        !menuSearch ||
        item.name?.toLowerCase().includes(menuSearch.toLowerCase()) ||
        item.description?.toLowerCase().includes(menuSearch.toLowerCase())

      const d = (item.dietary || '').toLowerCase()
      let matchDietary = true
      if (dietaryFilter === 'Veg') {
        matchDietary = d.includes('veg') && !d.includes('non')
      } else if (dietaryFilter === 'Non-Veg') {
        matchDietary = d.includes('non')
      }

      return matchCat && matchSearch && matchDietary
    })
  }, [menuItems, selectedCategory, menuSearch, dietaryFilter])

  const selectedBranch = branches.find((b) => b._id === selectedBranchId)

  // Default delivery address selection
  useEffect(() => {
    if (customerProfile?.addresses?.length > 0 && !selectedAddressId) {
      const def =
        customerProfile.addresses.find((a) => a.isDefault) ||
        customerProfile.addresses[0]
      if (def) setSelectedAddressId(def._id)
    }
  }, [customerProfile, selectedAddressId])

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
      0,
    )
  }, [cart])

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  const finalOrderTotal = Math.max(0, cartSubtotal - discountAmount)

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((it) => it.menuItemId === item._id)
      if (existing) {
        return prev.map((it) =>
          it.menuItemId === item._id
            ? { ...it, quantity: it.quantity + 1 }
            : it,
        )
      }
      return [
        ...prev,
        {
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: 1,
          category: item.category,
          dietary: item.dietary,
          image: item.image,
        },
      ]
    })
  }

  const updateCartQuantity = (menuItemId, newQty) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((it) => it.menuItemId !== menuItemId))
    } else {
      setCart((prev) =>
        prev.map((it) =>
          it.menuItemId === menuItemId ? { ...it, quantity: newQty } : it,
        ),
      )
    }
  }

  const removeFromCart = (menuItemId) => {
    setCart((prev) => prev.filter((it) => it.menuItemId !== menuItemId))
  }

  const handleApplyCoupon = () => {
    setCouponMessage('')
    const code = couponInput.trim().toUpperCase()
    if (!code) return

    if (code === 'WELCOME25') {
      const discount = Math.min(250, Math.round(cartSubtotal * 0.25))
      setDiscountAmount(discount)
      setAppliedCoupon(code)
      setCouponMessage(`Promo code ${code} applied! 25% discount (₹${discount})`)
    } else if (code === 'ANOVAGOURMET') {
      if (cartSubtotal < 800) {
        setCouponMessage('ANOVAGOURMET requires a minimum order of ₹800.')
        return
      }
      setDiscountAmount(150)
      setAppliedCoupon(code)
      setCouponMessage(`Promo code ${code} applied! Flat ₹150 discount.`)
    } else if (code === 'WEEKENDLUX') {
      if (cartSubtotal < 1000) {
        setCouponMessage('WEEKENDLUX requires a minimum order of ₹1000.')
        return
      }
      const discount = Math.round(cartSubtotal * 0.15)
      setDiscountAmount(discount)
      setAppliedCoupon(code)
      setCouponMessage(`Promo code ${code} applied! 15% discount (₹${discount})`)
    } else {
      const discount = Math.round(cartSubtotal * 0.1)
      setDiscountAmount(discount)
      setAppliedCoupon(code)
      setCouponMessage(`Special offer ${code} applied: ₹${discount} off.`)
    }
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    if (cart.length === 0) return
    setOrderPlacing(true)
    setOrderError('')

    try {
      const itemsPayload = cart.map((i) => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
      }))

      const payload = {
        branchId: selectedBranchId,
        orderType,
        items: itemsPayload,
        notes: orderNotes.trim() || undefined,
        discount: discountAmount,
        couponCode: appliedCoupon || undefined,
      }

      const res = await apiClient('/api/orders', {
        method: 'POST',
        body: payload,
      })

      const placedOrder = res?.data || res
      setOrderSuccessData(placedOrder)
      setCart([])
      setDiscountAmount(0)
      setAppliedCoupon('')
      setCouponInput('')
      setOrderNotes('')

      try {
        const myOrdersRes = await apiClient('/api/orders/my')
        const list = Array.isArray(myOrdersRes?.data)
          ? myOrdersRes.data
          : Array.isArray(myOrdersRes)
          ? myOrdersRes
          : []
        setOrders(list)
      // eslint-disable-next-line no-empty
      } catch {}
    } catch (err) {
      setOrderError(err.message || 'Unable to place order. Please try again.')
    } finally {
      setOrderPlacing(false)
    }
  }

  // Copy offer code helper
  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(''), 3000)
  }

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMessage('')
    try {
      const res = await apiClient('/api/customers/me', {
        method: 'PUT',
        body: { phone: phoneInput },
      })
      const updated = res?.data || res
      setCustomerProfile((prev) => ({ ...prev, ...updated, phone: phoneInput }))
      setProfileMessage('Profile details updated successfully.')
      setTimeout(() => setProfileMessage(''), 4000)
    } catch (err) {
      setProfileMessage(err.message || 'Could not update profile.')
    } finally {
      setProfileSaving(false)
    }
  }

  // Handle Add Address
  const handleAddAddress = async (e) => {
    e.preventDefault()
    if (!addressForm.line1 || !addressForm.city) {
      alert('Please provide street address and city.')
      return
    }
    try {
      const res = await apiClient('/api/customers/me/addresses', {
        method: 'POST',
        body: addressForm,
      })
      // Server responds with { success: true, data: customer.addresses, message: 'Address added' }
      const newAddresses = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : Array.isArray(res?.data?.addresses)
        ? res.data.addresses
        : res?.addresses || []

      setCustomerProfile((prev) => ({
        ...(prev || {}),
        addresses: newAddresses,
      }))
      setShowAddressForm(false)
      setAddressForm({
        label: 'home',
        line1: '',
        city: '',
        postalCode: '',
        isDefault: false,
      })
      setProfileMessage('Address saved successfully.')
      setTimeout(() => setProfileMessage(''), 4000)
      loadProfile()
    } catch (err) {
      alert(err.message || 'Unable to save address.')
    }
  }

  // Handle Delete Address
  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to remove this address?')) return
    try {
      const res = await apiClient(`/api/customers/me/addresses/${addressId}`, {
        method: 'DELETE',
      })
      const newAddresses = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : Array.isArray(res?.data?.addresses)
        ? res.data.addresses
        : res?.addresses || []

      setCustomerProfile((prev) => ({
        ...(prev || {}),
        addresses: newAddresses,
      }))
      setProfileMessage('Address removed successfully.')
      setTimeout(() => setProfileMessage(''), 4000)
      loadProfile()
    } catch (err) {
      alert(err.message || 'Unable to delete address.')
    }
  }

  // Handle Submit Review
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setFeedbackSuccess('')
    setFeedbackError('')
    if (!reviewOrder) {
      setFeedbackError('Please select a completed order to review.')
      return
    }
    try {
      await apiClient('/api/reviews', {
        method: 'POST',
        body: {
          order: reviewOrder,
          foodRating: rating,
          comment: reviewComment,
        },
      })
      setFeedbackSuccess('Thank you! Your dining review was received.')
      setReviewComment('')
      setReviewOrder('')
      const revRes = await apiClient('/api/reviews/mine')
      setPastReviews(revRes?.data || revRes || [])
    } catch (err) {
      setFeedbackError(err.message || 'Unable to submit review.')
    }
  }

  // Handle Submit Complaint
  const handleSubmitComplaint = async (e) => {
    e.preventDefault()
    setFeedbackSuccess('')
    setFeedbackError('')
    if (!complaintSubject.trim()) {
      setFeedbackError('Please enter a brief subject.')
      return
    }
    try {
      await apiClient('/api/complaints', {
        method: 'POST',
        body: {
          subject: complaintSubject,
          description: complaintDesc,
          category: complaintCategory,
          order: reviewOrder || undefined,
        },
      })
      setFeedbackSuccess('Your inquiry has been submitted. Our guest support team will follow up shortly.')
      setComplaintSubject('')
      setComplaintDesc('')
      const compRes = await apiClient('/api/complaints/mine')
      setPastComplaints(compRes?.data || compRes || [])
    } catch (err) {
      setFeedbackError(err.message || 'Unable to submit feedback ticket.')
    }
  }

  return (
    <div className="app-layout customer-portal">
      {/* Mobile Drawer Overlay */}
      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenu(false)}
        />
      )}

      {/* ANOVA Dark Green Sidebar */}
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <img className="brand-logo" src={Logo1} alt="Anova emblem" />
          <div className="brand-lockup">
            <div className="brand-name">Anova</div>
            <div className="brand-tagline">
              The Art of Intelligent Hospitality
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="side-nav" aria-label="Customer navigation">
          {customerNavigation.map((item) => {
            const isActive = activeTab === item.label
            return (
              <button
                key={item.label}
                type="button"
                className={`nav-item ${isActive ? 'nav-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  setActiveTab(item.label)
                  setMobileMenu(false)
                }}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="nav-item-label">{item.label}</span>
                {isActive && <span className="nav-indicator" />}
              </button>
            )
          })}
        </nav>

        {/* Sidebar Bottom / Concierge and Sign Out */}
        <div className="sidebar-bottom">
          

          <button
            className="sidebar-logout"
            type="button"
            onClick={onLogout}
          >
            <span aria-hidden="true">↪</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-panel">
        {/* Topbar with Breadcrumb & User profile */}
        <header className="topbar">
          <div className="breadcrumb">
            <span>Anova</span>
            <span className="breadcrumb-divider">/</span>
            <span>Guest Experience</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{activeTab}</strong>
          </div>

          <div className="topbar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <strong>{displayName}</strong>
              <span>Valued Guest</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          {/* ==================== TAB: OVERVIEW ==================== */}
          {activeTab === 'Overview' && (
            <>
              {/* Luxury Welcome Banner */}
              <section
                className="welcome-banner"
                style={{ backgroundImage: `url(${banner})` }}
              >
                <div className="banner-overlay" />
                <div className="banner-content">
                  <div className="banner-label">
                    <span className="banner-label-line" />
                    ANOVA GUEST EXPERIENCE
                  </div>
                  <h2>Welcome, {displayName}.</h2>
                  <p>
                    Discover signature menus from our dining locations, manage your culinary
                    reservations, track orders, and experience hospitality refined to perfection.
                  </p>
                </div>
              </section>

              {/* KPI Summary Cards */}
              <div className="customer-kpi-grid">
                <div
                  className="customer-kpi-card"
                  onClick={() => setActiveTab('Branches')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="customer-kpi-icon">⌂</div>
                  <div className="customer-kpi-info">
                    <h4>{branches.length}</h4>
                    <p>Dining Locations</p>
                  </div>
                </div>

                <div
                  className="customer-kpi-card gold"
                  onClick={() => setActiveTab('My Orders')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="customer-kpi-icon">🛍</div>
                  <div className="customer-kpi-info">
                    <h4>{orders.length}</h4>
                    <p>Your Orders</p>
                  </div>
                </div>

                <div
                  className="customer-kpi-card blue"
                  onClick={() => setActiveTab('Offers')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="customer-kpi-icon">🏷</div>
                  <div className="customer-kpi-info">
                    <h4>{offers.length}</h4>
                    <p>Exclusive Privileges</p>
                  </div>
                </div>

                <div
                  className="customer-kpi-card"
                  onClick={() => setActiveTab('Profile')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="customer-kpi-icon">★</div>
                  <div className="customer-kpi-info">
                    <h4>{customerProfile?.loyaltyPoints || 120}</h4>
                    <p>Loyalty Points</p>
                  </div>
                </div>
              </div>

              {/* Quick Jump Action Modules */}
              <div className="section-header-bar">
                <div>
                  <h2>Signature Services</h2>
                  <p>Quick access to your dining preferences and services</p>
                </div>
              </div>

              <div className="module-grid">
                <button
                  type="button"
                  className="module-card module-card-green"
                  onClick={() => setActiveTab('Branches')}
                >
                  <div className="module-icon-wrap">
                    <span className="module-icon">⌂</span>
                  </div>
                  <div className="module-card-body">
                    <div className="module-title">Explore Branches</div>
                    <div className="module-description">
                      Find nearby ANOVA locations, opening hours, and book your table.
                    </div>
                  </div>
                  <span className="module-arrow">→</span>
                </button>

                <button
                  type="button"
                  className="module-card module-card-gold"
                  onClick={() => setActiveTab('Menu')}
                >
                  <div className="module-icon-wrap">
                    <span className="module-icon">🍽</span>
                  </div>
                  <div className="module-card-body">
                    <div className="module-title">Dining Menu</div>
                    <div className="module-description">
                      Browse appetizers, chef specials, artisanal desserts, and fine beverages.
                    </div>
                  </div>
                  <span className="module-arrow">→</span>
                </button>

                <button
                  type="button"
                  className="module-card module-card-blue"
                  onClick={() => setActiveTab('My Orders')}
                >
                  <div className="module-icon-wrap">
                    <span className="module-icon">🛍</span>
                  </div>
                  <div className="module-card-body">
                    <div className="module-title">Order History</div>
                    <div className="module-description">
                      View recent dining receipts, track status, and repeat previous orders.
                    </div>
                  </div>
                  <span className="module-arrow">→</span>
                </button>

                <button
                  type="button"
                  className="module-card module-card-green"
                  onClick={() => setActiveTab('Offers')}
                >
                  <div className="module-icon-wrap">
                    <span className="module-icon">🏷</span>
                  </div>
                  <div className="module-card-body">
                    <div className="module-title">Special Privileges</div>
                    <div className="module-description">
                      Redeem promotional codes and seasonal member dining privileges.
                    </div>
                  </div>
                  <span className="module-arrow">→</span>
                </button>
              </div>
            </>
          )}

          {/* ==================== TAB: BRANCHES ==================== */}
          {activeTab === 'Branches' && (
            <div>
              <div className="section-header-bar">
                <div>
                  <h2>Our Restaurant Branches</h2>
                  <p>Select an ANOVA destination to view its curated menu & details</p>
                </div>
              </div>

              {branchesLoading ? (
                <div className="empty-state">
                  <p>Discovering available dining locations…</p>
                </div>
              ) : branchesError ? (
                <div className="alert-box error">
                  <span>{branchesError}</span>
                </div>
              ) : branches.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">⌂</div>
                  <h3>No branches found</h3>
                  <p>Locations are being updated. Please check back shortly.</p>
                </div>
              ) : (
                <div className="branch-grid">
                  {branches.map((b) => {
                    const isSelected = b._id === selectedBranchId
                    return (
                      <article key={b._id} className="branch-card">
                        <div>
                          <div className="branch-card-header">
                            <h3 className="branch-card-title">{b.name}</h3>
                            <span className="branch-status-pill">
                              <span className="branch-status-dot" />
                              {b.name?.toLowerCase().includes('pune')
                                ? '41 Dishes Available'
                                : 'Menu Coming Soon'}
                            </span>
                          </div>

                          <div className="branch-card-body">
                            {formatAddress(b.address) && (
                              <div className="branch-detail-row">
                                <span className="branch-detail-icon">📍</span>
                                <span>{formatAddress(b.address)}</span>
                              </div>
                            )}

                            {b.phone && (
                              <div className="branch-detail-row">
                                <span className="branch-detail-icon">📞</span>
                                <span>{b.phone}</span>
                              </div>
                            )}

                            {b.capacity && (
                              <div className="branch-detail-row">
                                <span className="branch-detail-icon">🪑</span>
                                <span>Seating capacity: {b.capacity} guests</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="branch-card-footer">
                          <button
                            type="button"
                            className={
                              isSelected ? 'btn-primary-anova' : 'btn-secondary-anova'
                            }
                            onClick={() => {
                              setSelectedBranchId(b._id)
                              setActiveTab('Menu')
                            }}
                          >
                            <span>{isSelected ? 'Browse Menu ★' : 'Explore Menu'}</span>
                            <span>→</span>
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB: MENU ==================== */}
          {activeTab === 'Menu' && (
            <div>
              <div className="section-header-bar">
                <div>
                  <h2>Curated Dining Menu</h2>
                  <p>
                    Currently viewing:{' '}
                    <strong>{selectedBranch?.name || 'Selected Branch'}</strong>
                  </p>
                </div>
              </div>

              {/* Toolbar: Branch dropdown + Search input */}
              <div className="filter-toolbar">
                <select
                  className="branch-select-box"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  aria-label="Select Restaurant Branch"
                >
                  {branches.map((b) => {
                    const isPune = b.name?.toLowerCase().includes('pune')
                    return (
                      <option key={b._id} value={b._id}>
                        {b.name} {isPune ? '— (41 Dishes)' : '— (No items in DB yet)'}
                      </option>
                    )
                  })}
                </select>

                <div className="filter-input-wrap">
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="Search dishes, ingredients, or flavours…"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                  />
                </div>

                <div className="dietary-filters">
                  {['All', 'Veg', 'Non-Veg'].map((diet) => (
                    <button
                      key={diet}
                      type="button"
                      className={`category-pill ${dietaryFilter === diet ? 'active' : ''}`}
                      onClick={() => setDietaryFilter(diet)}
                    >
                      {diet}
                    </button>
                  ))}
                </div>

                {cartItemCount > 0 && (
                  <button
                    type="button"
                    className="btn-primary-anova"
                    onClick={() => setShowCheckoutModal(true)}
                    style={{ whiteSpace: 'nowrap', marginLeft: 'auto' }}
                  >
                    <span>🛍 View Order ({cartItemCount}) • {formatPrice(cartSubtotal)}</span>
                  </button>
                )}
              </div>

              {/* Category Pills */}
              {categories.length > 1 && (
                <div className="category-pills">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Menu Items Grid */}
              {menuLoading ? (
                <div className="empty-state">
                  <p>Preparing menu presentation…</p>
                </div>
              ) : menuError ? (
                <div className="alert-box error">
                  <span>{menuError}</span>
                </div>
              ) : menuItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🍽</div>
                  <h3>No dishes in database for {selectedBranch?.name || 'this branch'} yet</h3>
                  <p style={{ maxWidth: '520px', margin: '0 auto 16px' }}>
                    Menu items are stored per branch. Currently, only <strong>ANOVA Pune (Main Branch)</strong> has all 41 menu dishes stored in the database.
                  </p>
                  {branches.some((b) => b.name?.toLowerCase().includes('pune')) && (
                    <button
                      type="button"
                      className="btn-primary-anova"
                      onClick={() => {
                        const pune = branches.find((b) =>
                          b.name?.toLowerCase().includes('pune'),
                        )
                        if (pune) setSelectedBranchId(pune._id)
                      }}
                    >
                      Switch to ANOVA Pune Menu (41 Dishes) →
                    </button>
                  )}
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🔍</div>
                  <h3>No dishes match your active filters</h3>
                  <p style={{ margin: '0 0 16px' }}>
                    Try clearing search keywords or selecting &apos;All&apos; in category and dietary filters.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary-anova"
                    onClick={() => {
                      setMenuSearch('')
                      setSelectedCategory('All')
                      setDietaryFilter('All')
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="menu-grid">
                  {filteredMenuItems.map((item) => {
                    const isVeg =
                      item.dietary?.toLowerCase().includes('veg') &&
                      !item.dietary?.toLowerCase().includes('non')
                    const isNonVeg = item.dietary?.toLowerCase().includes('non')
                    const cartItem = cart.find((it) => it.menuItemId === item._id)
                    return (
                      <article
                        key={item._id}
                        className={`dish-card ${cartItem ? 'in-cart' : ''}`}
                      >
                        <div className="dish-media">
                          {cartItem && (
                            <span className="dish-selected-tag">
                              ✓ {cartItem.quantity} selected
                            </span>
                          )}

                          {item.image ? (
                            <img
                              className="dish-image"
                              src={item.image}
                              alt={item.name}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                if (e.currentTarget.parentElement) {
                                  const fallback = e.currentTarget.parentElement.querySelector(
                                    '.dish-placeholder-fallback',
                                  )
                                  if (fallback) fallback.style.display = 'flex'
                                }
                              }}
                            />
                          ) : null}

                          <div
                            className="dish-placeholder dish-placeholder-fallback"
                            style={{ display: item.image ? 'none' : 'flex' }}
                          >
                            <span>🍽</span>
                            <div>ANOVA CUISINE</div>
                          </div>

                          <span
                            className={`dish-availability-badge ${
                              item.available ? 'available' : 'unavailable'
                            }`}
                          >
                            {item.available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>

                        <div className="dish-content">
                          <div className="dish-header">
                            <h3 className="dish-title">{item.name}</h3>
                            <span className="dish-price">{formatPrice(item.price)}</span>
                          </div>

                          <div className="dish-meta-row">
                            {item.category && (
                              <span className="dish-category-label">
                                {item.category}
                              </span>
                            )}

                            {item.dietary && (
                              <span
                                className={`dietary-tag ${
                                  isVeg ? 'veg' : isNonVeg ? 'non-veg' : ''
                                }`}
                              >
                                {item.dietary}
                              </span>
                            )}
                          </div>

                          {item.description && (
                            <p className="dish-description">{item.description}</p>
                          )}

                          <div className="dish-action-row">
                            {cartItem ? (
                              <div className="cart-qty-stepper">
                                <button
                                  type="button"
                                  className="qty-btn"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateCartQuantity(item._id, cartItem.quantity - 1)
                                  }}
                                  aria-label="Decrease quantity"
                                >
                                  −
                                </button>
                                <span className="qty-number">
                                  {cartItem.quantity} selected
                                </span>
                                <button
                                  type="button"
                                  className="qty-btn"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateCartQuantity(item._id, cartItem.quantity + 1)
                                  }}
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn-add-to-order"
                                disabled={!item.available}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addToCart(item)
                                }}
                              >
                                <span>+</span>
                                <span>{item.available ? 'Add to Order' : 'Unavailable'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}

              {/* Floating Order Cart Tray */}
              {cartItemCount > 0 && (
                <aside className="floating-cart-tray">
                  <div className="cart-tray-content">
                    <div className="cart-tray-left">
                      <div className="cart-tray-icon-box">
                        <span>🛍</span>
                        <span className="cart-tray-counter">{cartItemCount}</span>
                      </div>
                      <div>
                        <div className="cart-tray-title">
                          {cartItemCount} {cartItemCount === 1 ? 'dish chosen' : 'dishes chosen'}
                        </div>
                        <div className="cart-tray-subtext">
                          Subtotal: <strong>{formatPrice(cartSubtotal)}</strong> • {selectedBranch?.name}
                        </div>
                      </div>
                    </div>

                    <div className="cart-tray-actions">
                      <button
                        type="button"
                        className="btn-view-cart"
                        onClick={() => setShowCheckoutModal(true)}
                      >
                        <span>Review Order &amp; Checkout</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          )}

          {/* ==================== TAB: MY ORDERS ==================== */}
          {activeTab === 'My Orders' && (
            <div>
              <div className="section-header-bar">
                <div>
                  <h2>My Dining Orders</h2>
                  <p>Track live statuses and review receipts of past orders</p>
                </div>
              </div>

              {ordersLoading ? (
                <div className="empty-state">
                  <p>Retrieving your order records…</p>
                </div>
              ) : ordersError ? (
                <div className="alert-box error">
                  <span>{ordersError}</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🛍</div>
                  <h3>No orders placed yet</h3>
                  <p>
                    Browse our signature menu and place an order at any of our branches.
                  </p>
                  <button
                    type="button"
                    className="btn-primary-anova"
                    onClick={() => setActiveTab('Menu')}
                  >
                    Explore Menu & Order
                  </button>
                </div>
              ) : (
                <div className="orders-list">
                  {orders.map((o) => {
                    const statusClass = (o.status || 'pending').toLowerCase()
                    return (
                      <article key={o._id} className="order-card">
                        <div className="order-card-header">
                          <div className="order-id-group">
                            <h3 className="order-id-title">
                              Order #{o.orderNumber || o._id.slice(-6).toUpperCase()}
                            </h3>
                            <span className="order-date-text">
                              • {formatDate(o.createdAt)}
                            </span>
                          </div>

                          <span className={`order-status-badge ${statusClass}`}>
                            {o.status || 'Pending'}
                          </span>
                        </div>

                        {o.branch?.name && (
                          <div style={{ fontSize: '13px', color: '#55625a' }}>
                            <strong>Branch:</strong> {o.branch.name}
                          </div>
                        )}

                        <div className="order-items-preview">
                          {(o.items || []).map((it, idx) => (
                            <div key={idx} className="order-item-line">
                              <span>
                                {it.quantity}x {it.name || it.item?.name || 'Dish'}
                              </span>
                              <span>{formatPrice((it.price || 0) * (it.quantity || 1))}</span>
                            </div>
                          ))}
                        </div>

                        <div className="order-card-footer">
                          <div>
                            <span style={{ fontSize: '13px', color: '#748078' }}>
                              Order Total:{' '}
                            </span>
                            <span className="order-total-amount">
                              {formatPrice(o.total || o.billTotal || 0)}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="btn-secondary-anova"
                            onClick={() => {
                              setReviewOrder(o._id)
                              setActiveTab('Feedback')
                              setFeedbackTab('review')
                            }}
                          >
                            <span>Rate this Order ★</span>
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB: OFFERS ==================== */}
          {activeTab === 'Offers' && (
            <div>
              <div className="section-header-bar">
                <div>
                  <h2>Exclusive Guest Privileges</h2>
                  <p>Apply these promotional codes during checkout or reservations</p>
                </div>
              </div>

              {offersLoading ? (
                <div className="empty-state">
                  <p>Checking active rewards…</p>
                </div>
              ) : (
                <div className="offers-grid">
                  {offers.map((offer) => (
                    <article key={offer._id || offer.code} className="offer-card">
                      <div>
                        <span className="offer-badge">
                          {offer.discountPercent
                            ? `${offer.discountPercent}% OFF`
                            : `FLAT ₹${offer.discountAmount} OFF`}
                        </span>

                        <h3 style={{ margin: '0 0 8px', color: '#193b2b', fontSize: '18px' }}>
                          {offer.code}
                        </h3>

                        <p style={{ margin: '0 0 14px', fontSize: '13.5px', color: '#5a6860', lineHeight: '1.5' }}>
                          {offer.description}
                        </p>
                      </div>

                      <div>
                        <div className="offer-code-box">
                          <span className="offer-code-text">{offer.code}</span>
                          <button
                            type="button"
                            className="copy-btn"
                            onClick={() => handleCopyCode(offer.code)}
                          >
                            {copiedCode === offer.code ? 'Copied ✓' : 'Copy Code'}
                          </button>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '11.5px',
                            color: '#7f8a83',
                          }}
                        >
                          <span>Min Order: {formatPrice(offer.minOrder || 0)}</span>
                          <span>Valid till {formatDate(offer.expiresAt) || 'Ongoing'}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB: FEEDBACK ==================== */}
          {activeTab === 'Feedback' && (
            <div>
              <div className="section-header-bar">
                <div>
                  <h2>Guest Relations & Feedback</h2>
                  <p>Share your dining impressions or request assistance from our team</p>
                </div>
              </div>

              {feedbackSuccess && (
                <div className="alert-box success">
                  <span>{feedbackSuccess}</span>
                </div>
              )}

              {feedbackError && (
                <div className="alert-box error">
                  <span>{feedbackError}</span>
                </div>
              )}

              <div className="tabs-navigation">
                <button
                  type="button"
                  className={`tab-btn ${feedbackTab === 'review' ? 'active' : ''}`}
                  onClick={() => setFeedbackTab('review')}
                >
                  Dining Review
                </button>
                <button
                  type="button"
                  className={`tab-btn ${feedbackTab === 'complaint' ? 'active' : ''}`}
                  onClick={() => setFeedbackTab('complaint')}
                >
                  Guest Inquiry / Support
                </button>
                <button
                  type="button"
                  className={`tab-btn ${feedbackTab === 'history' ? 'active' : ''}`}
                  onClick={() => setFeedbackTab('history')}
                >
                  My Submissions ({pastReviews.length + pastComplaints.length})
                </button>
              </div>

              {feedbackTab === 'review' && (
                <div className="form-panel">
                  <form onSubmit={handleSubmitReview}>
                    <div className="form-group">
                      <label>Select Order to Review</label>
                      <select
                        className="form-control"
                        value={reviewOrder}
                        onChange={(e) => setReviewOrder(e.target.value)}
                        required
                      >
                        <option value="">-- Choose past order --</option>
                        {orders.map((o) => (
                          <option key={o._id} value={o._id}>
                            Order #{o.orderNumber || o._id.slice(-6)} (
                            {formatDate(o.createdAt)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Culinary Experience Rating</label>
                      <div className="rating-picker">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={`rating-star-btn ${star <= rating ? 'active' : ''}`}
                            onClick={() => setRating(star)}
                            aria-label={`${star} Stars`}
                          >
                            ★
                          </button>
                        ))}
                        <span style={{ fontSize: '13px', color: '#6d7b73', marginLeft: '8px' }}>
                          {rating} of 5 Stars
                        </span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Comments & Thoughts</label>
                      <textarea
                        className="form-control"
                        rows={4}
                        placeholder="Tell us what you enjoyed about the flavours, ambience, or service…"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn-primary-anova">
                      Submit Review
                    </button>
                  </form>
                </div>
              )}

              {feedbackTab === 'complaint' && (
                <div className="form-panel">
                  <form onSubmit={handleSubmitComplaint}>
                    <div className="form-group">
                      <label>Inquiry Category</label>
                      <select
                        className="form-control"
                        value={complaintCategory}
                        onChange={(e) => setComplaintCategory(e.target.value)}
                      >
                        <option value="food_quality">Food Quality & Taste</option>
                        <option value="late_delivery">Delivery / Service Timing</option>
                        <option value="wrong_item">Incorrect Dish / Item</option>
                        <option value="staff_behavior">Hospitality & Service</option>
                        <option value="billing">Billing & Payment</option>
                        <option value="other">Other Inquiry</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Subject</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Brief summary of the issue"
                        value={complaintSubject}
                        onChange={(e) => setComplaintSubject(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Detailed Explanation</label>
                      <textarea
                        className="form-control"
                        rows={4}
                        placeholder="Provide details so our guest relations manager can assist promptly…"
                        value={complaintDesc}
                        onChange={(e) => setComplaintDesc(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn-primary-anova">
                      Send to Guest Support
                    </button>
                  </form>
                </div>
              )}

              {feedbackTab === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {pastReviews.length === 0 && pastComplaints.length === 0 ? (
                    <div className="empty-state">
                      <p>You have not submitted any feedback yet.</p>
                    </div>
                  ) : (
                    <>
                      {pastReviews.length > 0 && (
                        <div>
                          <h3 style={{ fontSize: '16px', color: '#193b2b', marginBottom: '12px' }}>
                            Your Dining Reviews
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {pastReviews.map((r) => (
                              <div
                                key={r._id}
                                style={{
                                  background: '#fff',
                                  padding: '16px',
                                  borderRadius: '10px',
                                  border: '1px solid #e3e9e3',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <span style={{ color: '#c5a46d', fontSize: '15px' }}>
                                    {'★'.repeat(r.foodRating || 5)}
                                  </span>
                                  <span style={{ fontSize: '12px', color: '#88938c' }}>
                                    {formatDate(r.createdAt)}
                                  </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '13.5px', color: '#445148' }}>
                                  {r.comment || 'No comment provided.'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {pastComplaints.length > 0 && (
                        <div style={{ marginTop: '14px' }}>
                          <h3 style={{ fontSize: '16px', color: '#193b2b', marginBottom: '12px' }}>
                            Your Support Inquiries
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {pastComplaints.map((c) => (
                              <div
                                key={c._id}
                                style={{
                                  background: '#fff',
                                  padding: '16px',
                                  borderRadius: '10px',
                                  border: '1px solid #e3e9e3',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <strong style={{ fontSize: '14px', color: '#193b2b' }}>
                                    {c.subject}
                                  </strong>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      background: '#f1f4ee',
                                      color: '#285541',
                                      fontWeight: '600',
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    {c.status || 'open'}
                                  </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '13px', color: '#55625a' }}>
                                  {c.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB: PROFILE ==================== */}
          {activeTab === 'Profile' && (
            <div>
              <div className="section-header-bar">
                <div>
                  <h2>Guest Profile & Addresses</h2>
                  <p>Manage your contact details, dietary preferences, and saved locations</p>
                </div>
              </div>

              {profileMessage && (
                <div className="alert-box success">
                  <span>{profileMessage}</span>
                </div>
              )}

              <div className="profile-grid">
                {/* Personal Information Card */}
                <div className="form-panel" style={{ maxWidth: 'none' }}>
                  <h3 style={{ margin: '0 0 16px', color: '#193b2b', fontSize: '17px' }}>
                    Personal Details
                  </h3>

                  <form onSubmit={handleUpdateProfile}>
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={user?.name || customerProfile?.user?.name || displayName}
                        disabled
                        style={{ background: '#f5f7f4' }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        value={user?.email || customerProfile?.user?.email || ''}
                        disabled
                        style={{ background: '#f5f7f4' }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Contact Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="e.g. +91 98765 43210"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Membership Status</label>
                      <div
                        style={{
                          padding: '10px 14px',
                          background: '#eaf4ed',
                          color: '#237841',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                        }}
                      >
                        ✓ ANOVA Preferred Guest ({customerProfile?.loyaltyPoints || 120} Loyalty Points)
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary-anova"
                      disabled={profileSaving}
                    >
                      {profileSaving ? 'Saving…' : 'Save Contact Details'}
                    </button>
                  </form>
                </div>

                {/* Saved Delivery Addresses Panel */}
                <div className="form-panel" style={{ maxWidth: 'none' }}>
                  <div className="address-section-header">
                    <div>
                      <h3 className="address-section-title">Saved Delivery Addresses</h3>
                      <p className="address-section-subtitle">
                        Manage your delivery destinations for fast &amp; seamless ordering
                      </p>
                    </div>

                    <button
                      type="button"
                      className={showAddressForm ? 'btn-secondary-anova' : 'btn-primary-anova'}
                      onClick={() => setShowAddressForm(!showAddressForm)}
                    >
                      {showAddressForm ? '✕ Close Form' : '+ Add New Address'}
                    </button>
                  </div>

                  {showAddressForm && (
                    <form onSubmit={handleAddAddress} className="address-form-box">
                      <div className="form-group">
                        <label>Address Type</label>
                        <div className="label-selector-row">
                          {[
                            { id: 'home', label: 'Home', icon: '🏠' },
                            { id: 'work', label: 'Work / Office', icon: '🏢' },
                            { id: 'other', label: 'Other', icon: '📍' },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className={`label-btn ${
                                addressForm.label === item.id ? 'active' : ''
                              }`}
                              onClick={() =>
                                setAddressForm({ ...addressForm, label: item.id })
                              }
                            >
                              <span>{item.icon}</span>
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Street Address / Flat / Building</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. 102 Ivory Towers, Senapati Bapat Road"
                          value={addressForm.line1}
                          onChange={(e) =>
                            setAddressForm({ ...addressForm, line1: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '14px',
                        }}
                      >
                        <div className="form-group">
                          <label>City</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Pune / Vadodara"
                            value={addressForm.city}
                            onChange={(e) =>
                              setAddressForm({ ...addressForm, city: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Postal Code</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. 390018 / 411016"
                            value={addressForm.postalCode}
                            onChange={(e) =>
                              setAddressForm({
                                ...addressForm,
                                postalCode: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="form-checkbox-row">
                        <input
                          type="checkbox"
                          id="isDefaultCheckbox"
                          checked={addressForm.isDefault}
                          onChange={(e) =>
                            setAddressForm({
                              ...addressForm,
                              isDefault: e.target.checked,
                            })
                          }
                        />
                        <label htmlFor="isDefaultCheckbox">
                          Set as primary default delivery destination
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" className="btn-primary-anova">
                          Save Delivery Address
                        </button>
                        <button
                          type="button"
                          className="btn-secondary-anova"
                          onClick={() => setShowAddressForm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {(!customerProfile?.addresses ||
                      customerProfile.addresses.length === 0) &&
                    !showAddressForm ? (
                      <div className="empty-state" style={{ padding: '36px 20px' }}>
                        <div className="empty-state-icon">📍</div>
                        <h3>No Saved Addresses Yet</h3>
                        <p style={{ margin: '0 0 16px' }}>
                          Add your home or office address to ensure quick checkout and deliveries.
                        </p>
                        <button
                          type="button"
                          className="btn-primary-anova"
                          onClick={() => setShowAddressForm(true)}
                        >
                          + Add Your First Address
                        </button>
                      </div>
                    ) : (
                      (customerProfile?.addresses || []).map((addr, idx) => {
                        const labelType = (addr.label || 'home').toLowerCase()
                        const labelIcon =
                          labelType === 'work' ? '🏢' : labelType === 'other' ? '📍' : '🏠'
                        return (
                          <article
                            key={addr._id || idx}
                            className={`luxury-address-card ${
                              addr.isDefault ? 'is-default' : ''
                            }`}
                          >
                            <div className="luxury-address-card-header">
                              <div className="luxury-address-tags">
                                <span className={`luxury-label-badge ${labelType}`}>
                                  <span>{labelIcon}</span>
                                  <span>{addr.label || 'Home'}</span>
                                </span>

                                {addr.isDefault && (
                                  <span className="luxury-default-badge">
                                    <span>★</span>
                                    <span>Default Address</span>
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                className="btn-remove-address"
                                onClick={() => handleDeleteAddress(addr._id)}
                                title="Remove this saved address"
                              >
                                <span aria-hidden="true">✕</span>
                                <span>Remove</span>
                              </button>
                            </div>

                            <div className="luxury-address-body">
                              <div className="address-street-line">
                                <span className="address-pin-icon" aria-hidden="true">
                                  📍
                                </span>
                                <span>{addr.line1 || addr.street}</span>
                              </div>

                              <div className="address-city-line">
                                {[addr.city, addr.postalCode].filter(Boolean).join(' • ')}
                              </div>
                            </div>

                            <div className="luxury-address-footer">
                              <span className="address-dest-note">
                                {addr.isDefault
                                  ? '✓ Primary destination for ANOVA orders'
                                  : 'Saved destination'}
                              </span>
                            </div>
                          </article>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Luxury Checkout & Order Review Modal */}
      {showCheckoutModal && (
        <div
          className="checkout-modal-overlay"
          onClick={() => setShowCheckoutModal(false)}
        >
          <div
            className="checkout-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="checkout-modal-header">
              <div className="checkout-modal-title">
                <h2>
                  {orderSuccessData
                    ? 'Order Confirmation'
                    : 'Review Order & Checkout'}
                </h2>
                <p>
                  {selectedBranch?.name || 'ANOVA Dining'} • {cartItemCount}{' '}
                  {cartItemCount === 1 ? 'dish selected' : 'dishes selected'}
                </p>
              </div>

              <button
                type="button"
                className="btn-modal-close"
                onClick={() => {
                  setShowCheckoutModal(false)
                  setOrderSuccessData(null)
                }}
                aria-label="Close Checkout"
              >
                ✕
              </button>
            </div>

            {orderSuccessData ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '56px', marginBottom: '14px' }}>🎉</div>
                <h2
                  style={{
                    color: '#193b2b',
                    margin: '0 0 10px',
                    fontSize: '24px',
                  }}
                >
                  Order Placed Successfully!
                </h2>
                <p
                  style={{
                    color: '#55655b',
                    fontSize: '15px',
                    maxWidth: '440px',
                    margin: '0 auto 16px',
                    lineHeight: 1.6,
                  }}
                >
                  Order{' '}
                  <strong>
                    #
                    {orderSuccessData.orderNumber ||
                      orderSuccessData._id?.slice(-6).toUpperCase()}
                  </strong>{' '}
                  has been dispatched to the ANOVA kitchen team.
                </p>
                <div
                  style={{
                    padding: '14px 24px',
                    background: '#eaf4ed',
                    borderRadius: '10px',
                    display: 'inline-block',
                    marginBottom: '28px',
                    border: '1px solid #c2e2cc',
                  }}
                >
                  <span
                    style={{
                      color: '#237841',
                      fontWeight: '700',
                      fontSize: '16px',
                    }}
                  >
                    Total Billed:{' '}
                    {formatPrice(orderSuccessData.total || finalOrderTotal)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '14px',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    className="btn-primary-anova"
                    onClick={() => {
                      setShowCheckoutModal(false)
                      setOrderSuccessData(null)
                      setActiveTab('My Orders')
                    }}
                  >
                    Track in My Orders →
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-anova"
                    onClick={() => {
                      setShowCheckoutModal(false)
                      setOrderSuccessData(null)
                    }}
                  >
                    Back to Dining Menu
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handlePlaceOrder}
                className="checkout-modal-body"
              >
                <div>
                  {/* Selected Items */}
                  <div className="checkout-section-block">
                    <div className="checkout-section-heading">
                      <span>🍽</span> Your Selected Dishes ({cartItemCount})
                    </div>

                    <div className="checkout-items-list">
                      {cart.map((item) => (
                        <div
                          key={item.menuItemId}
                          className="checkout-item-row"
                        >
                          <div className="checkout-item-info">
                            <div className="checkout-item-title">
                              {item.name}
                            </div>
                            <div className="checkout-item-unit-price">
                              {formatPrice(item.price)} each
                            </div>
                          </div>

                          <div className="checkout-item-controls">
                            <div
                              className="cart-qty-stepper"
                              style={{ width: '100px', height: '32px' }}
                            >
                              <button
                                type="button"
                                className="qty-btn"
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  fontSize: '14px',
                                }}
                                onClick={() =>
                                  updateCartQuantity(
                                    item.menuItemId,
                                    item.quantity - 1,
                                  )
                                }
                              >
                                −
                              </button>
                              <span
                                className="qty-number"
                                style={{ fontSize: '13px' }}
                              >
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                className="qty-btn"
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  fontSize: '14px',
                                }}
                                onClick={() =>
                                  updateCartQuantity(
                                    item.menuItemId,
                                    item.quantity + 1,
                                  )
                                }
                              >
                                +
                              </button>
                            </div>

                            <strong
                              style={{
                                minWidth: '60px',
                                textAlign: 'right',
                                color: '#193b2b',
                                fontSize: '14px',
                              }}
                            >
                              {formatPrice(item.price * item.quantity)}
                            </strong>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.menuItemId)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#a44b4b',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                              title="Remove item"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Type */}
                  <div className="checkout-section-block">
                    <div className="checkout-section-heading">
                      <span>🍴</span> Dining Mode
                    </div>

                    <div className="checkout-order-types">
                      {[
                        { id: 'Delivery', label: 'Delivery', icon: '🛵' },
                        { id: 'Takeaway', label: 'Takeaway', icon: '🛍' },
                        { id: 'Dine-in', label: 'Dine-in', icon: '🍽' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`checkout-type-btn ${
                            orderType === t.id ? 'active' : ''
                          }`}
                          onClick={() => setOrderType(t.id)}
                        >
                          <span style={{ fontSize: '18px' }}>{t.icon}</span>
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Address selection */}
                  {orderType === 'Delivery' && (
                    <div className="checkout-section-block">
                      <div className="checkout-section-heading">
                        <span>📍</span> Delivery Destination
                      </div>

                      {!customerProfile?.addresses ||
                      customerProfile.addresses.length === 0 ? (
                        <div
                          style={{
                            padding: '12px 14px',
                            background: '#fbf4ea',
                            border: '1px solid #f2e3cb',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#9b7028',
                          }}
                        >
                          No saved delivery address found. Please enter your
                          delivery address in the special requests below or add
                          one in the Profile tab.
                        </div>
                      ) : (
                        <select
                          className="form-control"
                          value={selectedAddressId}
                          onChange={(e) =>
                            setSelectedAddressId(e.target.value)
                          }
                        >
                          {customerProfile.addresses.map((addr) => (
                            <option key={addr._id} value={addr._id}>
                              {addr.label
                                ? `[${addr.label.toUpperCase()}] `
                                : ''}
                              {addr.line1 || addr.street}, {addr.city}{' '}
                              {addr.postalCode ? `(${addr.postalCode})` : ''}
                              {addr.isDefault ? ' — (Default)' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Special Instructions */}
                  <div
                    className="checkout-section-block"
                    style={{ marginBottom: 0 }}
                  >
                    <div className="checkout-section-heading">
                      <span>📝</span> Special Requests / Cooking Instructions
                    </div>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="e.g. Mild spice, pack extra napkins, contact-free delivery…"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Right Column: Pricing & Coupon */}
                <div>
                  <div className="checkout-bill-card">
                    <div
                      className="checkout-section-heading"
                      style={{ marginBottom: '14px' }}
                    >
                      <span>🏷</span> Promo Code / Coupon
                    </div>

                    <div className="coupon-input-group">
                      <input
                        type="text"
                        className="coupon-input"
                        placeholder="e.g. WELCOME25"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-apply-coupon"
                        onClick={handleApplyCoupon}
                      >
                        Apply
                      </button>
                    </div>

                    {couponMessage && (
                      <div
                        style={{
                          fontSize: '12px',
                          color:
                            discountAmount > 0 ? '#237841' : '#b34848',
                          marginBottom: '16px',
                          fontWeight: '500',
                        }}
                      >
                        {couponMessage}
                      </div>
                    )}

                    <div
                      className="checkout-section-heading"
                      style={{ margin: '18px 0 12px' }}
                    >
                      <span>🧾</span> Bill Summary
                    </div>

                    <div className="checkout-bill-row">
                      <span>Items Subtotal</span>
                      <span>{formatPrice(cartSubtotal)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="checkout-bill-row discount">
                        <span>Coupon Discount ({appliedCoupon})</span>
                        <span>- {formatPrice(discountAmount)}</span>
                      </div>
                    )}

                    <div className="checkout-bill-row">
                      <span>Delivery &amp; Packaging</span>
                      <span style={{ color: '#237841', fontWeight: '600' }}>
                        FREE
                      </span>
                    </div>

                    <div className="checkout-bill-total">
                      <span>Total Payable</span>
                      <span>{formatPrice(finalOrderTotal)}</span>
                    </div>

                    {orderError && (
                      <div
                        className="alert-box error"
                        style={{
                          marginTop: '14px',
                          padding: '10px 12px',
                          fontSize: '13px',
                        }}
                      >
                        <span>{orderError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn-place-order"
                      disabled={orderPlacing || cart.length === 0}
                    >
                      {orderPlacing
                        ? 'Placing Order…'
                        : `Confirm & Place Order (${formatPrice(finalOrderTotal)})`}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
