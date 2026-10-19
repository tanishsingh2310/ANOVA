function Topbar({ title = "Dashboard" }) {
  return (
    <header className="anova-topbar">
      <div className="anova-topbar-heading">
        <p className="anova-topbar-eyebrow">
          ANOVA / RESTAURANT MANAGEMENT
        </p>

        <h2>{title}</h2>
      </div>

      <div className="anova-topbar-actions">
        <div className="anova-branch-indicator">
          <span className="anova-branch-dot"></span>
          <span>Branch Overview</span>
        </div>

        <div className="anova-profile">
          <div className="anova-profile-avatar">AD</div>

          <div className="anova-profile-info">
            <strong>Administrator</strong>
            <span>System Access</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;