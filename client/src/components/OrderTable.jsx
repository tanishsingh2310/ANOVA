import { orders } from "../data/restaurantData";
import StatusBadge from "./StatusBadge";

function OrderTable() {
  return (
    <div className="orders-section">
      <div className="section-header">
        <div>
          <h3>Recent Orders</h3>
          <p>Latest orders across restaurant branches.</p>
        </div>

        <button className="view-all-button">View All</button>
      </div>

      <div className="orders-table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Branch</th>
              <th>Items</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="order-id">{order.id}</td>

                <td>{order.customer}</td>

                <td>{order.branch}</td>

                <td>{order.items.join(", ")}</td>

                <td>₹{order.amount}</td>

                <td>
                  <StatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OrderTable;