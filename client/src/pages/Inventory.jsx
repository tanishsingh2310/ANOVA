import { inventory } from "../data/restaurantData";

function Inventory() {
  return (
    <div className="dashboard-page">

      <div className="page-heading">

        <div>
          <h2>Inventory Management</h2>
          <p>Monitor and manage restaurant stock levels.</p>
        </div>

        <span className="date-label">
          24 September 2026
        </span>

      </div>


      <div className="inventory-section">

        <div className="section-header">

          <div>
            <h3>Current Inventory</h3>
            <p>Stock availability across the selected branch.</p>
          </div>

          <button className="view-all-button">
            + Add Item
          </button>

        </div>


        <div className="inventory-list">

          {inventory.map((item) => (

            <div
              className="inventory-row"
              key={item.id}
            >

              <div className="inventory-item">

                <strong>
                  {item.item}
                </strong>

                <span>
                  Current quantity: {item.quantity} {item.unit}
                </span>

              </div>


              <div className="inventory-right">

                <span
                  className={`inventory-status ${item.status
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >
                  {item.status}
                </span>

                <button className="inventory-action">
                  Update
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}

export default Inventory;