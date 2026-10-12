import { orders } from "../data/restaurantData";
import StatusBadge from "../components/StatusBadge";

function Orders() {
  return (
    <div className="dashboard-page">

      <div className="page-heading">
        <div>
          <h2>All Orders</h2>
          <p>View and monitor restaurant orders.</p>
        </div>

        <span className="date-label">
          24 September 2026
        </span>
      </div>


      <div className="orders-section">

        <div className="section-header">

          <div>
            <h3>Order Management</h3>
            <p>Recent orders from all branches.</p>
          </div>

          <button className="view-all-button">
            + New Order
          </button>

        </div>


        <div className="orders-table-wrapper">

          <table className="orders-table">

            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Branch</th>
                <th>Table</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>


            <tbody>

              {orders.map((order) => (

                <tr key={order.id}>

                  <td className="order-id">
                    {order.id}
                  </td>

                  <td>
                    {order.customer}
                  </td>

                  <td>
                    {order.branch}
                  </td>

                  <td>
                    {order.table}
                  </td>

                  <td>
                    {order.items.join(", ")}
                  </td>

                  <td>
                    ₹{order.amount}
                  </td>

                  <td>
                    <StatusBadge status={order.status} />
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

export default Orders;