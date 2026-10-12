import { useState } from "react";
import { orders } from "../data/restaurantData";
import StatusBadge from "../components/StatusBadge";

function Kitchen() {

  const [kitchenOrders, setKitchenOrders] = useState(
    orders.filter(
      (order) =>
        order.status === "Pending" ||
        order.status === "Preparing" ||
        order.status === "Ready"
    )
  );


  function updateOrderStatus(orderId) {

    setKitchenOrders((currentOrders) => {

      return currentOrders
        .map((order) => {

          if (order.id !== orderId) {
            return order;
          }

          let newStatus = order.status;

          if (order.status === "Pending") {
            newStatus = "Preparing";
          }
          else if (order.status === "Preparing") {
            newStatus = "Ready";
          }
          else if (order.status === "Ready") {
            newStatus = "Delivered";
          }

          return {
            ...order,
            status: newStatus
          };

        })
        .filter((order) => order.status !== "Delivered");

    });
  }


  return (
    <div className="dashboard-page">

      <div className="page-heading">

        <div>
          <h2>Kitchen Display</h2>
          <p>Monitor orders that require kitchen attention.</p>
        </div>

        <span className="date-label">
          24 September 2026
        </span>

      </div>


      <div className="kitchen-grid">

        {kitchenOrders.map((order) => (

          <div
            className="kitchen-card"
            key={order.id}
          >

            <div className="kitchen-card-header">

              <div>

                <strong>
                  {order.id}
                </strong>

                <span>
                  {order.table}
                </span>

              </div>

              <StatusBadge
                status={order.status}
              />

            </div>


            <div className="kitchen-customer">
              {order.customer}
            </div>


            <div className="kitchen-items">

              {order.items.map((item, index) => (

                <div
                  className="kitchen-item"
                  key={index}
                >

                  <span>
                    {item}
                  </span>

                  <span>
                    1
                  </span>

                </div>

              ))}

            </div>


            <div className="kitchen-card-footer">

              <span>
                {order.branch}
              </span>

              <button
                className="kitchen-action"
                onClick={() =>
                  updateOrderStatus(order.id)
                }
              >
                Update Status
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}

export default Kitchen;