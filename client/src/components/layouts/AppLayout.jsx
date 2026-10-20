
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function AppLayout({
  children,
  activePage,
  setActivePage,
  title,
  subtitle,
  breadcrumb,
  branches = [],
  selectedBranch,
  onSelectBranch,
  currentUser,
  alertsCount = 0,
}) {
  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        alertsCount={alertsCount}
      />

      <div className="app-main">
        <Topbar
          title={title}
          subtitle={subtitle}
          breadcrumb={breadcrumb}
          branches={branches}
          selectedBranch={selectedBranch}
          onSelectBranch={onSelectBranch}
          currentUser={currentUser}
        />

        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  )
}
