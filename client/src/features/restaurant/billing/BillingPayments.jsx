import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../services/api";
import "../../../styles/billing-payments.css";

const BRANCH_ID = "6ad0e90a53cc462cbaaec9fa";

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const mapInvoice = (invoice) => ({
  ...invoice,
  id: invoice.invoiceNumber,
  orderId: invoice.orderNumber,
  date: invoice.createdAt,
  branch: "Current Branch",
  items: invoice.items || [],
  transactions: invoice.transactions || [],
  subtotal: Number(invoice.subtotal) || 0,
  discount: Number(invoice.discount) || 0,
  taxRate: Number(invoice.taxRate) || 0,
  total: Number(invoice.total) || 0,
  amountPaid: Number(invoice.amountPaid) || 0,
  paymentMethod: invoice.paymentMethod || "Not recorded",
  status: invoice.status || "Pending",
});

function BillingPayments() {
  const [bills, setBills] = useState([]);
  const [orders, setOrders] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");

  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentBill, setPaymentBill] = useState(null);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentAmount, setPaymentAmount] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [taxRate, setTaxRate] = useState("5");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadBillingData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [invoiceData, orderData] = await Promise.all([
        apiRequest(`/api/payments/${BRANCH_ID}`),
        apiRequest(`/api/orders/${BRANCH_ID}`),
      ]);

      if (!Array.isArray(invoiceData) || !Array.isArray(orderData)) {
        throw new Error("The server returned an unexpected response.");
      }

      setBills(invoiceData.map(mapInvoice));
      setOrders(orderData);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to load invoices and orders. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  const invoicedOrderIds = useMemo(
    () => new Set(bills.map((bill) => String(bill.orderId))),
    [bills]
  );

  const availableOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status !== "Cancelled" &&
          !invoicedOrderIds.has(String(order.orderNumber))
      ),
    [orders, invoicedOrderIds]
  );

  const summary = useMemo(() => {
    const paidBills = bills.filter((bill) => bill.status === "Paid");

    const outstanding = bills.reduce(
      (sum, bill) =>
        sum + Math.max(bill.total - bill.amountPaid, 0),
      0
    );

    return {
      revenue: bills.reduce(
        (sum, bill) => sum + bill.amountPaid,
        0
      ),
      paid: paidBills.length,
      pending: bills.filter((bill) => bill.status !== "Paid").length,
      outstanding,
    };
  }, [bills]);

  const filteredBills = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bills.filter((bill) => {
      const matchesSearch =
        bill.id.toLowerCase().includes(query) ||
        bill.orderId.toLowerCase().includes(query) ||
        bill.customer.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || bill.status === statusFilter;

      const matchesBranch =
        branchFilter === "All" || bill.branch === branchFilter;

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [bills, search, statusFilter, branchFilter]);

  const closeCreateInvoice = () => {
    if (saving) return;

    setShowCreateInvoice(false);
    setSelectedOrderId("");
    setDiscount("0");
    setTaxRate("5");
  };

  const createInvoice = async (event) => {
    event.preventDefault();

    if (!selectedOrderId) {
      setError("Please select an order.");
      return;
    }

    const numericDiscount = Number(discount);
    const numericTaxRate = Number(taxRate);

    if (
      !Number.isFinite(numericDiscount) ||
      numericDiscount < 0 ||
      !Number.isFinite(numericTaxRate) ||
      numericTaxRate < 0 ||
      numericTaxRate > 100
    ) {
      setError("Enter a valid discount and tax rate.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const invoice = await apiRequest("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          branchId: BRANCH_ID,
          orderId: selectedOrderId,
          discount: numericDiscount,
          taxRate: numericTaxRate,
        }),
      });

      setBills((currentBills) => [
        mapInvoice(invoice),
        ...currentBills,
      ]);

      setShowCreateInvoice(false);
      setSelectedOrderId("");
      setDiscount("0");
      setTaxRate("5");

      setSuccessMessage(
        `${invoice.invoiceNumber} created successfully.`
      );
    } catch (requestError) {
      setError(
        requestError.message || "Unable to create the invoice."
      );
    } finally {
      setSaving(false);
    }
  };

  const recordPayment = async (event) => {
    event.preventDefault();

    if (!paymentBill) return;

    const amount = Number(paymentAmount);
    const balance = Math.max(
      paymentBill.total - paymentBill.amountPaid,
      0
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > balance + 0.001
    ) {
      setError(
        `Enter an amount greater than ₹0 and no more than ${currency(balance)}.`
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const updatedInvoice = await apiRequest(
        `/api/payments/${BRANCH_ID}/${paymentBill._id}/payments`,
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            method: paymentMethod,
          }),
        }
      );

      const mappedInvoice = mapInvoice(updatedInvoice);

      setBills((currentBills) =>
        currentBills.map((bill) =>
          bill._id === mappedInvoice._id ? mappedInvoice : bill
        )
      );

      setSelectedBill((currentBill) =>
        currentBill?._id === mappedInvoice._id
          ? mappedInvoice
          : currentBill
      );

      setPaymentBill(null);
      setPaymentAmount("");
      setPaymentMethod("UPI");

      setSuccessMessage(
        `Payment of ${currency(amount)} recorded successfully.`
      );
    } catch (requestError) {
      setError(
        requestError.message || "Unable to record the payment."
      );
    } finally {
      setSaving(false);
    }
  };

  const openPaymentForm = (bill) => {
    setError("");
    setPaymentBill(bill);

    setPaymentAmount(
      Math.max(bill.total - bill.amountPaid, 0).toFixed(2)
    );

    setPaymentMethod("UPI");
  };

  const printReceipt = (bill) => {
    setSelectedBill(bill);

    window.setTimeout(() => {
      window.print();
    }, 100);
  };

  const selectedOrder = orders.find(
    (order) => String(order._id) === selectedOrderId
  );

  const selectedOrderSubtotal = selectedOrder
    ? selectedOrder.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
    : 0;

  const calculatedDiscount = Number(discount) || 0;
  const calculatedTaxRate = Number(taxRate) || 0;

  const estimatedTotal =
    Math.max(selectedOrderSubtotal - calculatedDiscount, 0) *
    (1 + calculatedTaxRate / 100);

  return (
    <main className="billing-page">
      <header className="billing-header">
        <div>
          <p className="billing-eyebrow">RESTAURANT OPERATIONS</p>
          <h1>Billing &amp; Payments</h1>
          <p className="billing-subtitle">
            Manage invoices, track outstanding balances, and record payments.
          </p>
        </div>

        <div className="billing-header-badge">
          <span className="billing-live-dot" />
          Billing Overview
        </div>
      </header>

      {error && (
        <div className="billing-alert billing-alert-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div
          className="billing-alert billing-alert-success"
          role="status"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="billing-summary-grid">
        <article className="billing-summary-card">
          <div className="billing-summary-top">
            <span className="billing-summary-label">
              Collected Revenue
            </span>
            <span className="billing-summary-icon">₹</span>
          </div>
          <h2>{currency(summary.revenue)}</h2>
          <p>Payments recorded across all invoices</p>
        </article>

        <article className="billing-summary-card">
          <div className="billing-summary-top">
            <span className="billing-summary-label">Paid Bills</span>
            <span className="billing-summary-icon">✓</span>
          </div>
          <h2>{summary.paid}</h2>
          <p>Invoices fully settled</p>
        </article>

        <article className="billing-summary-card">
          <div className="billing-summary-top">
            <span className="billing-summary-label">
              Unsettled Bills
            </span>
            <span className="billing-summary-icon">◷</span>
          </div>
          <h2>{summary.pending}</h2>
          <p>Pending or partially paid invoices</p>
        </article>

        <article className="billing-summary-card billing-outstanding-card">
          <div className="billing-summary-top">
            <span className="billing-summary-label">
              Outstanding Balance
            </span>
            <span className="billing-summary-icon">↗</span>
          </div>
          <h2>{currency(summary.outstanding)}</h2>
          <p>Amount remaining to be collected</p>
        </article>
      </section>

      <section className="billing-table-section">
        <div className="billing-section-heading">
          <div>
            <h2>Invoices &amp; Transactions</h2>
            <p>Review bills and manage their payment status.</p>
          </div>

          <div className="billing-header-actions">
            <span className="billing-record-count">
              {filteredBills.length} records
            </span>

            <button
              type="button"
              className="billing-primary-button"
              onClick={() => {
                setError("");
                setShowCreateInvoice(true);
              }}
              disabled={availableOrders.length === 0}
              title={
                availableOrders.length === 0
                  ? "There are no uninvoiced orders available."
                  : "Create an invoice from an existing order"
              }
            >
              + Create Invoice
            </button>
          </div>
        </div>

        <div className="billing-toolbar">
          <div className="billing-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search invoice, order or customer..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search invoices"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by payment status"
          >
            <option value="All">All statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending</option>
          </select>

          <select
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            aria-label="Filter by branch"
          >
            <option value="All">Current branch</option>
            <option value="Current Branch">Current branch</option>
          </select>
        </div>

        <div className="billing-table-wrapper">
          <table className="billing-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Branch / Date</th>
                <th>Bill Amount</th>
                <th>Balance Due</th>
                <th>Payment Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="billing-empty">
                    Loading invoices from the server...
                  </td>
                </tr>
              ) : (
                <>
                  {filteredBills.map((bill) => {
                    const balance = Math.max(
                      bill.total - bill.amountPaid,
                      0
                    );

                    return (
                      <tr key={bill._id}>
                        <td>
                          <strong className="billing-invoice-id">
                            {bill.id}
                          </strong>
                          <span className="billing-order-id">
                            {bill.orderId}
                          </span>
                        </td>

                        <td>
                          <strong>{bill.customer}</strong>
                        </td>

                        <td>
                          <span className="billing-branch">
                            {bill.branch}
                          </span>
                          <span className="billing-date">
                            {formatDate(bill.date)}
                          </span>
                        </td>

                        <td>
                          <strong>{currency(bill.total)}</strong>
                        </td>

                        <td>
                          <strong
                            className={
                              balance > 0
                                ? "billing-balance-due"
                                : "billing-balance-clear"
                            }
                          >
                            {currency(balance)}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`billing-status billing-status-${bill.status
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {bill.status}
                          </span>
                        </td>

                        <td>
                          <div className="billing-actions">
                            <button
                              type="button"
                              className="billing-action-button"
                              onClick={() => setSelectedBill(bill)}
                            >
                              View
                            </button>

                            {balance > 0 && (
                              <button
                                type="button"
                                className="billing-pay-button"
                                onClick={() => openPaymentForm(bill)}
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredBills.length === 0 && (
                    <tr>
                      <td colSpan="7" className="billing-empty">
                        <span>⌕</span>
                        <strong>No invoices found</strong>
                        <p>
                          {bills.length === 0
                            ? "Create an invoice from an existing order to get started."
                            : "Try changing your search or filters."}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedBill && (
        <div
          className="billing-modal-overlay"
          onClick={() => setSelectedBill(null)}
        >
          <section
            className="billing-modal billing-receipt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-receipt-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="billing-modal-heading">
              <div>
                <p className="billing-eyebrow">
                  ANOVA · PAYMENT RECEIPT
                </p>
                <h2 id="billing-receipt-title">Invoice Details</h2>
              </div>

              <button
                type="button"
                className="billing-modal-close"
                onClick={() => setSelectedBill(null)}
                aria-label="Close invoice details"
              >
                ×
              </button>
            </div>

            <div className="billing-receipt-brand">
              <span className="billing-receipt-logo">A</span>
              <div>
                <h3>Anova</h3>
                <p>{selectedBill.branch}</p>
              </div>
            </div>

            <div className="billing-receipt-meta">
              <div>
                <span>Invoice number</span>
                <strong>{selectedBill.id}</strong>
              </div>

              <div>
                <span>Order reference</span>
                <strong>{selectedBill.orderId}</strong>
              </div>

              <div>
                <span>Customer</span>
                <strong>{selectedBill.customer}</strong>
              </div>

              <div>
                <span>Invoice date</span>
                <strong>{formatDate(selectedBill.date)}</strong>
              </div>
            </div>

            <div className="billing-receipt-items">
              <div className="billing-receipt-row billing-receipt-items-head">
                <span>Item</span>
                <span>Qty</span>
                <span>Amount</span>
              </div>

              {selectedBill.items.map((item, index) => (
                <div
                  className="billing-receipt-row"
                  key={`${item.name}-${index}`}
                >
                  <span>{item.name}</span>
                  <span>{item.quantity}</span>
                  <span>
                    {currency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="billing-receipt-totals">
              <div>
                <span>Subtotal</span>
                <span>{currency(selectedBill.subtotal)}</span>
              </div>

              <div>
                <span>Discount</span>
                <span>− {currency(selectedBill.discount)}</span>
              </div>

              <div>
                <span>Tax ({selectedBill.taxRate}%)</span>
                <span>
                  {currency(
                    ((selectedBill.subtotal - selectedBill.discount) *
                      selectedBill.taxRate) /
                      100
                  )}
                </span>
              </div>

              <div className="billing-receipt-grand-total">
                <strong>Total</strong>
                <strong>{currency(selectedBill.total)}</strong>
              </div>

              <div>
                <span>Amount paid</span>
                <span>{currency(selectedBill.amountPaid)}</span>
              </div>

              <div>
                <span>Balance due</span>
                <strong>
                  {currency(
                    Math.max(
                      selectedBill.total - selectedBill.amountPaid,
                      0
                    )
                  )}
                </strong>
              </div>
            </div>

            <div className="billing-receipt-payment">
              <span>Payment method</span>
              <strong>{selectedBill.paymentMethod}</strong>

              <span
                className={`billing-status billing-status-${selectedBill.status
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                {selectedBill.status}
              </span>
            </div>

            {selectedBill.transactions.length > 0 && (
              <div className="billing-transaction-history">
                <h3>Payment History</h3>

                {selectedBill.transactions.map((transaction) => (
                  <div
                    className="billing-transaction-row"
                    key={transaction._id}
                  >
                    <div>
                      <strong>{transaction.method}</strong>
                      <span>
                        {formatDate(transaction.transactionDate)}
                      </span>
                    </div>

                    <strong>{currency(transaction.amount)}</strong>
                  </div>
                ))}
              </div>
            )}

            <div className="billing-modal-actions">
              <button
                type="button"
                className="billing-secondary-button"
                onClick={() => setSelectedBill(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="billing-primary-button"
                onClick={() => printReceipt(selectedBill)}
              >
                Print Receipt
              </button>
            </div>
          </section>
        </div>
      )}

      {paymentBill && (
        <div
          className="billing-modal-overlay"
          onClick={() => !saving && setPaymentBill(null)}
        >
          <section
            className="billing-modal billing-payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-payment-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="billing-modal-heading">
              <div>
                <p className="billing-eyebrow">PAYMENT COLLECTION</p>
                <h2 id="billing-payment-title">Record Payment</h2>
              </div>

              <button
                type="button"
                className="billing-modal-close"
                onClick={() => !saving && setPaymentBill(null)}
                aria-label="Close payment form"
                disabled={saving}
              >
                ×
              </button>
            </div>

            <div className="billing-payment-summary">
              <span>Invoice {paymentBill.id}</span>
              <strong>{paymentBill.customer}</strong>

              <div>
                <span>Outstanding balance</span>
                <strong>
                  {currency(
                    Math.max(
                      paymentBill.total - paymentBill.amountPaid,
                      0
                    )
                  )}
                </strong>
              </div>
            </div>

            <form onSubmit={recordPayment}>
              <label htmlFor="billing-payment-amount">
                Payment Amount (₹)
              </label>

              <input
                id="billing-payment-amount"
                type="number"
                min="0.01"
                max={Math.max(
                  paymentBill.total - paymentBill.amountPaid,
                  0
                )}
                step="0.01"
                value={paymentAmount}
                onChange={(event) =>
                  setPaymentAmount(event.target.value)
                }
                required
                disabled={saving}
              />

              <label htmlFor="billing-payment-method">
                Payment Method
              </label>

              <select
                id="billing-payment-method"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value)
                }
                disabled={saving}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Online">Online Payment</option>
              </select>

              <div className="billing-modal-actions">
                <button
                  type="button"
                  className="billing-secondary-button"
                  onClick={() => setPaymentBill(null)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="billing-primary-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showCreateInvoice && (
        <div
          className="billing-modal-overlay"
          onClick={closeCreateInvoice}
        >
          <section
            className="billing-modal billing-create-invoice-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-create-invoice-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="billing-modal-heading">
              <div>
                <p className="billing-eyebrow">RESTAURANT OPERATIONS</p>
                <h2 id="billing-create-invoice-title">
                  Create Invoice
                </h2>
              </div>

              <button
                type="button"
                className="billing-modal-close"
                onClick={closeCreateInvoice}
                disabled={saving}
                aria-label="Close invoice form"
              >
                ×
              </button>
            </div>

            {availableOrders.length === 0 ? (
              <div className="billing-empty">
                <strong>No orders available</strong>
                <p>
                  All eligible orders already have invoices, or there
                  are no non-cancelled orders in this branch.
                </p>
              </div>
            ) : (
              <form onSubmit={createInvoice}>
                <label htmlFor="billing-order-select">
                  Select Order
                </label>

                <select
                  id="billing-order-select"
                  value={selectedOrderId}
                  onChange={(event) =>
                    setSelectedOrderId(event.target.value)
                  }
                  required
                  disabled={saving}
                >
                  <option value="">Choose an order...</option>

                  {availableOrders.map((order) => (
                    <option key={order._id} value={order._id}>
                      {order.orderNumber} — {order.customer} —{" "}
                      {currency(order.totalAmount)}
                    </option>
                  ))}
                </select>

                {selectedOrder && (
                  <div className="billing-payment-summary">
                    <span>Order details</span>
                    <strong>{selectedOrder.customer}</strong>

                    <div>
                      <span>Order status</span>
                      <strong>{selectedOrder.status}</strong>
                    </div>

                    <div>
                      <span>Order subtotal</span>
                      <strong>
                        {currency(selectedOrderSubtotal)}
                      </strong>
                    </div>
                  </div>
                )}

                <label htmlFor="billing-invoice-discount">
                  Discount (₹)
                </label>

                <input
                  id="billing-invoice-discount"
                  type="number"
                  min="0"
                  max={selectedOrderSubtotal}
                  step="0.01"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  disabled={saving}
                />

                <label htmlFor="billing-invoice-tax">Tax Rate (%)</label>

                <input
                  id="billing-invoice-tax"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(event) => setTaxRate(event.target.value)}
                  required
                  disabled={saving}
                />

                {selectedOrder && (
                  <div className="billing-payment-summary">
                    <div>
                      <span>Estimated invoice total</span>
                      <strong>{currency(estimatedTotal)}</strong>
                    </div>
                  </div>
                )}

                <div className="billing-modal-actions">
                  <button
                    type="button"
                    className="billing-secondary-button"
                    onClick={closeCreateInvoice}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="billing-primary-button"
                    disabled={saving || !selectedOrderId}
                  >
                    {saving ? "Creating..." : "Create Invoice"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default BillingPayments;