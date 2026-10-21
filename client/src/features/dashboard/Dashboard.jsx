import { useEffect, useState } from 'react'
import './dashboard.css'
import InventoryModule from '../inventory/InventoryModule.jsx'
import MenuManagement from '../restaurant/menu/MenuManagement.jsx'
import TableManagement from '../restaurant/tables/TableManagement.jsx'
import Reservations from '../restaurant/reservations/Reservations.jsx'
import Orders from '../restaurant/orders/Orders.jsx'
import KitchenWorkflow from '../restaurant/kitchen/KitchenWorkflow.jsx'
import BillingPayments from '../restaurant/billing/BillingPayments.jsx'
import FoodRecommendations from '../restaurant/recommendations/FoodRecommendations.jsx'
import Branches from '../branches/Branches.jsx'
import Logo1 from '../../assets/Logo1.png'
import banner from '../../assets/banner.png'
import DashboardStatistics from './DashboardStatistics.jsx'
import './statistics.css'
import Employees from '../employees/Employees.jsx'
import Shifts from '../shifts/Shifts.jsx'
import Attendance from '../attendance/Attendance.jsx'
import Leave from '../leaves/Leaves.jsx'
import Payroll from "../payroll/Payroll.jsx";

const navigation = [
  {
    label: 'Overview',
    icon: '◫',
    group: 'Main',
    roles: ['owner', 'admin', 'manager', 'hr', 'employee'],
  },
  {
    label: 'Branches',
    icon: '⌂',
    group: 'Main',
    roles: ['owner', 'admin', 'manager', 'hr', 'inventory_manager', 'chef', 'cashier', 'employee'],
  },

  {
    label: 'Employees',
    icon: '♙',
    group: 'People & HR',
    roles: ['owner', 'admin', 'manager', 'hr'],
  },
  {
    label: 'Shifts',
    icon: '◷',
    group: 'People & HR',
    roles: ['owner', 'admin', 'manager', 'hr', 'employee'],
  },
  {
    label: 'Attendance',
    icon: '✓',
    group: 'People & HR',
    roles: ['owner', 'admin', 'manager', 'hr', 'employee'],
  },
  {
    label: 'Leave requests',
    icon: '▤',
    group: 'People & HR',
    roles: ['owner', 'admin', 'manager', 'hr', 'employee'],
  },
  {
    label: 'Payroll',
    icon: '₹',
    group: 'People & HR',
    roles: ['owner', 'admin', 'hr'],
  },

  {
    label: 'Menu',
    icon: 'M',
    group: 'Restaurant Operations',
    roles: ['owner', 'admin', 'manager', 'chef'],
  },
  {
    label: 'Tables',
    icon: 'T',
    group: 'Restaurant Operations',
    roles: ['owner', 'admin', 'manager', 'cashier'],
  },
  {
    label: 'Reservations',
    icon: 'R',
    group: 'Restaurant Operations',
    roles: ['owner', 'admin', 'manager', 'cashier'],
  },
  {
    label: 'Orders',
    icon: 'O',
    group: 'Restaurant Operations',
    roles: ['owner', 'admin', 'manager', 'chef', 'cashier'],
  },
  {
    label: 'Kitchen Workflow',
    icon: 'K',
    group: 'Restaurant Operations',
    roles: ['owner', 'admin', 'manager', 'chef'],
  },
  {
    label: 'Billing & Payments',
    icon: 'B',
    group: 'Restaurant Operations',
    roles: ['owner', 'admin', 'manager', 'cashier'],
  },

  {
    label: 'Inventory',
    icon: 'I',
    group: 'Inventory & Supply Chain',
    roles: ['owner', 'admin', 'manager', 'inventory_manager', 'chef'],
  },
  {
    label: 'Food Recommendations',
    icon: 'F',
    group: 'Customer Experience',
    roles: ['owner', 'admin', 'manager', 'chef'],
  },
]

const navigationGroups = [
  { label: 'People & HR', icon: '♙' },
  { label: 'Restaurant Operations', icon: '▦' },
  { label: 'Inventory & Supply Chain', icon: '▤' },
  { label: 'Customer Experience', icon: '♡' },
]


const modules = [
  {
    title: 'Branches',
    description: 'Manage restaurant locations and branch information.',
    icon: '⌂',
    tone: 'green',
  },
  {
    title: 'Employees',
    description: 'View team members, roles and employment details.',
    icon: '♙',
    tone: 'gold',
  },
  {
    title: 'Shifts',
    description: 'Organise staff schedules and shift assignments.',
    icon: '◷',
    tone: 'blue',
  },
  {
    title: 'Attendance',
    description: 'Review attendance records and working hours.',
    icon: '✓',
    tone: 'green',
  },
  {
    title: 'Leave requests',
    description: 'Review and manage employee leave requests.',
    icon: '▤',
    tone: 'gold',
  },
  {
    title: 'Payroll',
    description: 'Access payroll operations and salary records.',
    icon: '₹',
    tone: 'blue',
  },
  {
  title: 'Inventory',
  description: 'Track ingredients, suppliers, purchase orders, transfers and wastage.',
  icon: 'I',
  tone: 'green',
},
]

export default function Dashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('Overview')
  const [mobileMenu, setMobileMenu] = useState(false)

  const [branches, setBranches] = useState([])
const [selectedBranchId, setSelectedBranchId] = useState('all')
const [branchLoading, setBranchLoading] = useState(true)
const [branchError, setBranchError] = useState('')

useEffect(() => {
  const controller = new AbortController()

  async function loadBranches() {
    setBranchLoading(true)
    setBranchError('')

    try {
      const token = sessionStorage.getItem('mbrems_token')
      const apiBase = (
        import.meta.env.VITE_API_URL || 'http://localhost:5000'
      ).replace(/\/+$/, '')

      const response = await fetch(`${apiBase}/api/branches`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load branches.')
      }

      const availableBranches = Array.isArray(data.branches)
        ? data.branches
        : []

      setBranches(availableBranches)

      
setSelectedBranchId((currentId) => {
  if (currentId === 'all') {
    return 'all'
  }

  if (availableBranches.some((branch) => branch._id === currentId)) {
    return currentId
  }

  return 'all'
})


      if (availableBranches.length === 0) {
        setBranchError('No active branches are available to your account.')
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setBranchError(error.message || 'Unable to load branches.')
      }
    } finally {
      if (!controller.signal.aborted) {
        setBranchLoading(false)
      }
    }
  }

  loadBranches()

  return () => controller.abort()
}, [])


  const [expandedGroups, setExpandedGroups] = useState({
  'People & HR': false,
})
  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role),
  )

  const displayName = user?.name || user?.email || 'Team member'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  function selectPage(label) {
    setActivePage(label)
    setMobileMenu(false)
  }

  return (
    <div className="app-layout">
      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenu(false)}
        />
      )}

      
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

  
<nav className="side-nav" aria-label="Workspace navigation">

  {/* Standalone pages */}
  {visibleNavigation
    .filter((item) => item.group === 'Main')
    .map((item) => (
      <button
        key={item.label}
        type="button"
        className={`nav-item ${
          activePage === item.label ? 'nav-active' : ''
        }`}
        aria-current={activePage === item.label ? 'page' : undefined}
        onClick={() => selectPage(item.label)}
      >
        <span className="nav-icon" aria-hidden="true">{item.icon}</span>
        <span className="nav-item-label">{item.label}</span>
      </button>
    ))}

  {/* Expandable groups */}
  {navigationGroups.map((group) => {
    const items = visibleNavigation.filter(
      (item) => item.group === group.label,
    )

    if (!items.length) return null

    const isExpanded = Boolean(expandedGroups[group.label])
    const containsActivePage = items.some(
      (item) => item.label === activePage,
    )
    const groupId = `menu-${group.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}`

    return (
      <div className="nav-group" key={group.label}>
        <button
          type="button"
          className={`nav-group-toggle ${
            containsActivePage ? 'group-has-active' : ''
          }`}
          aria-expanded={isExpanded}
          aria-controls={groupId}
          onClick={() =>
            setExpandedGroups((previous) => ({
              ...previous,
              [group.label]: !previous[group.label],
            }))
          }
        >
          <span className="nav-icon" aria-hidden="true">
            {group.icon}
          </span>
          <span className="nav-item-label">{group.label}</span>
          <span className={`nav-chevron ${isExpanded ? 'is-open' : ''}`}>
            ▾
          </span>
        </button>

        {isExpanded && (
          <div className="nav-submenu" id={groupId}>
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`nav-subitem ${
                  activePage === item.label ? 'nav-subitem-active' : ''
                }`}
                aria-current={
                  activePage === item.label ? 'page' : undefined
                }
                onClick={() => selectPage(item.label)}
              >
                <span className="nav-subitem-dot" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  })}
</nav>


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

      <main className="main-panel">
        <header className="topbar">
          



          

<div className="breadcrumb">
  <span>Anova</span>
  <span className="breadcrumb-divider">/</span>

  {activePage === 'Overview' ? (
    <strong>Overview</strong>
  ) : (
    <>
      {(() => {
        const group = visibleNavigation.find(
          (item) => item.label === activePage,
        )?.group

        return group && group !== 'Main' ? (
          <>
            <span>{group}</span>
            <span className="breadcrumb-divider">/</span>
          </>
        ) : null
      })()}

      <strong>{activePage}</strong>
    </>
  )}
</div>




<div className="topbar-user">
  <div className="user-avatar">
    {user?.profileImage || user?.avatarUrl ? (
      <img
        src={user.profileImage || user.avatarUrl}
        alt={`${displayName} profile`}
      />
    ) : (
      initials || 'U'
    )}
  </div>

  <div className="user-details">
    <strong>{displayName}</strong>
    <span>{(user?.role || 'Team member').replaceAll('_', ' ')}</span>
  </div>
</div>

        </header>

        <div className="page-content">
          <div className="page-intro">
            <div>

              <h1>{activePage === 'Overview' ? '' : activePage}</h1>
              <p>
                {activePage === 'Overview'
                  ? ''
                  : ""}
              </p>
            </div>
            <div className="heading-period">
              <span className="live-dot" />
            </div>
          </div>        

{activePage === 'Overview' ? (
  <>
  
<section
  className="welcome-banner"
  style={{ backgroundImage: `url(${banner})` }}
>
  <div className="banner-overlay" />
  <div className="banner-content">
    <div className="banner-label">
      <span className="banner-label-line" />
      ANOVA
    </div>

    <h2>Welcome, {displayName}</h2>
    <p>Everything you need, all in one place.</p>
  </div>
</section>

<DashboardStatistics />

    <div className="section-heading">
      <div>
        <h2>Your Workspace</h2>
        
      </div>
    </div>
    

    <section className="module-grid">
      {modules
        .filter((module) =>
          visibleNavigation.some((item) => item.label === module.title),
        )
        .map((module) => (
          <button
            className="module-card"
            key={module.title}
            onClick={() => selectPage(module.title)}
          >
            <div className={`module-icon module-tone-${module.tone}`}>
              {module.icon}
            </div>
            <div className="module-title">{module.title}</div>
            <p className="module-description">{module.description}</p>
            <div className="module-arrow" aria-hidden="true">↗</div>
          </button>
        ))}
    </section>

  </>
) : activePage === 'Inventory' ? (
  <InventoryModule selectedBranch="all" />
) : activePage === 'Menu' ? (
  <MenuManagement
  branchId={selectedBranchId}
  branches={branches}
  onBranchChange={setSelectedBranchId}
  branchLoading={branchLoading}
  branchError={branchError}
/>
) : activePage === 'Tables' ? (
  <TableManagement branchId={selectedBranchId} />

) : activePage === 'Table Management' ? (
  <TableManagement
    branchId={selectedBranchId}
    branches={branches}
    onBranchChange={setSelectedBranchId}
    branchLoading={branchLoading}
    branchError={branchError}
  />

) : activePage === 'Reservations' ? (
<Reservations
  branchId={selectedBranchId}
  branches={branches}
  onBranchChange={setSelectedBranchId}
  branchLoading={branchLoading}
  branchError={branchError}
/>

) : activePage === 'Orders' ? (
  <Orders
  branchId={selectedBranchId}
  branches={branches}
  onBranchChange={setSelectedBranchId}
  branchLoading={branchLoading}
  branchError={branchError}
/>
) : activePage === 'Kitchen Workflow' ? (
  <KitchenWorkflow branchId={selectedBranchId} />
) : activePage === 'Billing & Payments' ? (
  <BillingPayments branchId={selectedBranchId} />
) : activePage === 'Food Recommendations' ? (
  <FoodRecommendations branchId={selectedBranchId} />
) : activePage === 'Branches' ? (
  <Branches user={user} />
) : activePage === 'Employees' ? (
  <Employees user={user} />
) : activePage === 'Shifts' ? (
  <Shifts user={user} />
) : activePage === 'Attendance' ? (
  <Attendance user={user} />
) : activePage === 'Leave requests' ? (
  <Leave user={user} />
) : activePage === "Payroll" ? (
  <Payroll user={user} />
) : (
  <section className="module-placeholder">
    <div className="placeholder-icon">✳</div>
    <h2>{activePage}</h2>
    <p>
      This section is ready for its module interface. The next step
      is to connect it to the existing backend API.
    </p>
    <button
      className="secondary-button"
      onClick={() => selectPage('Overview')}
    >
      Back to overview
    </button>
  </section>
)}

        </div>
      </main>
    </div>
  )
}
