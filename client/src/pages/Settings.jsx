function Settings() {
  return (
    <div className="dashboard-page">

      <div className="page-heading">

        <div>
          <h2>Settings</h2>
          <p>Manage restaurant system preferences.</p>
        </div>

        <span className="date-label">
          System Settings
        </span>

      </div>

       <div className="dashboard-alerts">

  <restaurant-alert
    type="success"
    message="Restaurant system is running successfully."
  ></restaurant-alert>

  <restaurant-alert
    type="warning"
    message="Mozzarella stock is running low."
  ></restaurant-alert>

  <restaurant-alert
    type="info"
    message="New online order has been received."
  ></restaurant-alert>

</div>
      <div className="settings-grid">

        <div className="settings-card">

          <h3>Restaurant Information</h3>

          <p>
            Basic information about the restaurant enterprise.
          </p>

          <div className="setting-item">
            <span>Restaurant Name</span>
            <strong>RestoHub</strong>
          </div>

          <div className="setting-item">
            <span>Management Type</span>
            <strong>Multi-Branch</strong>
          </div>

        </div>


        <div className="settings-card">

          <h3>System Preferences</h3>

          <p>
            Configure basic application preferences.
          </p>

          <div className="setting-item">
            <span>Currency</span>
            <strong>Indian Rupee (₹)</strong>
          </div>

          <div className="setting-item">
            <span>Language</span>
            <strong>English</strong>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Settings;