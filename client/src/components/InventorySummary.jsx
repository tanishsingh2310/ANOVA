import { inventory } from "../data/restaurantData";

function InventorySummary() {
  return (
    <div className="inventory-section">

      <div className="section-header">
        <div>
          <h3>Inventory Summary</h3>
          <p>Current stock levels of important items.</p>
        </div>

        <button className="view-all-button">
          Manage Inventory
        </button>
      </div>

      <div className="inventory-list">

        {inventory.map((item) => (
          <div className="inventory-row" key={item.id}>

            <div className="inventory-item">
              <strong>{item.item}</strong>
              <span>
                {item.quantity} {item.unit}
              </span>
            </div>

            <span
              className={`inventory-status ${item.status
                .toLowerCase()
                .replace(" ", "-")}`}
            >
              {item.status}
            </span>

          </div>
        ))}

      </div>

    </div>
  );
}

export default InventorySummary;