export default function Topbar({
  title = "Dashboard",
  subtitle = "",
  breadcrumb = "ANOVA / INVENTORY & SUPPLY CHAIN",
  branches = [],
  selectedBranch = "all",
  onSelectBranch = () => {},
  currentUser = { name: "Administrator", role: "System Access" }
}) {
  return (
    <header className="anova-topbar">
      <div className="anova-topbar-heading">
        <p className="anova-topbar-eyebrow">{breadcrumb}</p>
        <h2>{title}</h2>
        {subtitle && <span className="anova-topbar-subtitle">{subtitle}</span>}
      </div>

      <div className="anova-topbar-actions">
        <div className="anova-branch-indicator">
          <span className="anova-branch-dot"></span>
          {branches && branches.length > 0 ? (
            <select
              className="anova-branch-select"
              value={selectedBranch}
              onChange={(e) => onSelectBranch(e.target.value)}
              aria-label="Filter by branch location"
            >
              <option value="all">All Branches (Overview)</option>
              {branches.map((b) => (
                <option key={b.id || b._id} value={b.id || b._id}>
                  {b.name} ({b.code || b.city || 'Branch'})
                </option>
              ))}
            </select>
          ) : (
            <span>Branch Overview</span>
          )}
        </div>

        <div className="anova-profile">
          <div className="anova-profile-avatar" title={currentUser.name}>
            {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'AD'}
          </div>
          <div className="anova-profile-info">
            <strong>{currentUser.name || 'Administrator'}</strong>
            <span>{currentUser.role || 'System Access'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
