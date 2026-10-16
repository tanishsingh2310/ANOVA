export default function Topbar({
  title = "Inventory & Supply Chain",
  subtitle = "",
  breadcrumb = "ANOVA / INVENTORY & SUPPLY CHAIN",
  branches = [],
  selectedBranch = "all",
  onSelectBranch = () => {},
  currentUser = { name: "Arjun Verma", role: "Enterprise Director", branch: "All Branches" }
}) {
  return (
    <header className="anova-topbar">
      <div className="anova-topbar-heading">
        <span className="anova-topbar-eyebrow">{breadcrumb}</span>
        <h2>{title}</h2>
        {subtitle && (
          <span className="anova-topbar-subtitle">{subtitle}</span>
        )}
      </div>

      <div className="anova-topbar-actions">
        {/* Branch Selector */}
        <div className="anova-branch-selector-wrapper">
          <span className="anova-branch-dot" title="Live Connection"></span>
          <select
            className="anova-branch-select"
            value={selectedBranch}
            onChange={(e) => onSelectBranch(e.target.value)}
            aria-label="Filter by branch location"
          >
            <option value="all">All Branches (Enterprise View)</option>
            {branches.map((b) => (
              <option key={b.id || b._id} value={b.id || b._id}>
                {b.name} ({b.code || b.city || 'Branch'})
              </option>
            ))}
          </select>
        </div>

        {/* User Profile */}
        <div className="anova-profile">
          <div className="anova-profile-avatar" title={currentUser.name}>
            {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'AV'}
          </div>
          <div className="anova-profile-info">
            <strong>{currentUser.name}</strong>
            <span>{currentUser.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
