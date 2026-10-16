import { useMemo, useState } from "react";
import "../../styles/billing-payments.css";

const initialBills = [
  {
    id: "INV-1001",
    orderId: "ORD-1001",
    customer: "Aarav Shah",
    branch: "Main Branch",
    date: "2026-10-15",
    items: [
      { name: "Paneer Tikka", quantity: 2, price: 280 },
      { name: "Butter Naan", quantity: 4, price: 55 },
      { name: "Dal Makhani", quantity: 1, price: 240 },
    ],
    subtotal: 1000,
    discount: 50,
    taxRate: 5,
    total: 997.5,
    amountPaid: 997.5,
    paymentMethod: "UPI",
    status: "Paid",
  },
  {
    id: "INV-1002",
    orderId: "ORD-1002",
    customer: "Diya Patel",
    branch: "West Branch",
    date: "2026-10-15",
    items: [
      { name: "Margherita Pizza", quantity: 1, price: 350 },
      { name: "Cold Coffee", quantity: 2, price: 140 },
    ],
    subtotal: 630,
    discount: 0,
    taxRate: 5,
    total: 661.5,
    amountPaid: 300,
    paymentMethod: "Card",
    status: "Partially Paid",
  },
  {
    id: "INV-1003",
    orderId: "ORD-1003",
    customer: "Rohan Mehta",
    branch: "Main Branch",
    date: "2026-10-14",
    items: [
      { name: "Veg Biryani", quantity: 2, price: 260 },
      { name: "Raita", quantity: 2, price: 60 },
    ],
    subtotal: 640,
    discount: 40,
    taxRate: 5,
    total: 630,
    amountPaid: 0,
    paymentMethod: "Not recorded",
    status: "Pending",
  },
  {
    id: "INV-1004",
    orderId: "ORD-1004",
    customer: "Meera Joshi",
    branch: "East Branch",
    date: "2026-10-14",
    items: [
      { name: "Hakka Noodles", quantity: 1, price: 220 },
      { name: "Spring Rolls", quantity: 2, price: 160 },
    ],
    subtotal: 540,
    discount: 20,
    taxRate: 5,
    total: 546,
    amountPaid: 546,
    paymentMethod: "Cash",
    status: "Paid",
  },
  {
    id: "INV-1005",
    orderId: "ORD-1005",
    customer: "Kabir Desai",
    branch: "South Branch",
    date: "2026-10-13",
    items: [
      { name: "Club Sandwich", quantity: 2, price: 210 },
      { name: "Lemon Iced Tea", quantity: 2, price: 110 },
    ],
    subtotal: 640,
    discount: 0,
    taxRate: 5,
    total: 672,
    amountPaid: 0,
    paymentMethod: "Not recorded",
    status: "Pending",
  },
];

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

function BillingPayments() {
  const [bills, setBills] = useState(initialBills);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentBill, setPaymentBill] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentAmount, setPaymentAmount] = useState("");

  const summary = useMemo(() => {
    const paidBills = bills.filter((bill) => bill.status === "Paid");
    const pendingAmount = bills.reduce(
      (sum, bill) => sum + Math.max(bill.total - bill.amountPaid, 0),
      0
    );

    return {
      revenue: bills.reduce((sum, bill) => sum + bill.amountPaid, 0),
      paid: paidBills.length,
      pending: bills.filter((bill) => bill.status !== "Paid").length,
      outstanding: pendingAmount,
    };
  }, [bills]);

  const filteredBills = bills.filter((bill) => {
    const query = search.toLowerCase();

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

  const recordPayment = (event) => {
    event.preventDefault();

    if (!paymentBill) return;

    const amount = Number(paymentAmount);
    const balance = paymentBill.total - paymentBill.amountPaid;

    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) {
      window.alert(
        `Enter an amount greater than ₹0 and no more than ${currency(balance)}.`
      );
      return;
    }

    setBills((currentBills) =>
      currentBills.map((bill) => {
        if (bill.id !== paymentBill.id) return bill;

        const newAmountPaid = Math.min(bill.amountPaid + amount, bill.total);

        return {
          ...bill,
          amountPaid: newAmountPaid,
          paymentMethod,
          status:
            newAmountPaid >= bill.total
              ? "Paid"
              : "Partially Paid",
        };
      })
    );

    setPaymentBill(null);
    setPaymentAmount("");
    setPaymentMethod("UPI");
    window.alert("Payment recorded successfully.");
  };

  const openPaymentForm = (bill) => {
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

      <section className="billing-summary-grid">
        <article className="billing-summary-card">
          <div className="billing-summary-top">
            <span className="billing-summary-label">Collected Revenue</span>
            <span className="billing-summary-icon">₹</span>
          </div>
          <h2>{currency(summary.revenue)}</h2>
          <p>Payments recorded across all bills</p>
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
            <span className="billing-summary-label">Unsettled Bills</span>
            <span className="billing-summary-icon">◷</span>
          </div>
          <h2>{summary.pending}</h2>
          <p>Pending or partially paid invoices</p>
        </article>

        <article className="billing-summary-card billing-outstanding-card">
          <div className="billing-summary-top">
            <span className="billing-summary-label">Outstanding Balance</span>
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
          <span className="billing-record-count">
            {filteredBills.length} records
          </span>
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
            <option value="All">All branches</option>
            <option value="Main Branch">Main Branch</option>
            <option value="West Branch">West Branch</option>
            <option value="East Branch">East Branch</option>
            <option value="South Branch">South Branch</option>
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
              {filteredBills.map((bill) => {
                const balance = Math.max(
                  bill.total - bill.amountPaid,
                  0
                );

                return (
                  <tr key={bill.id}>
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
                        {new Date(
                          `${bill.date}T00:00:00`
                        ).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
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
                    <p>Try changing your search or filters.</p>
                  </td>
                </tr>
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
                <p className="billing-eyebrow">ANOVA · PAYMENT RECEIPT</p>
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
                <strong>{selectedBill.date}</strong>
              </div>
            </div>

            <div className="billing-receipt-items">
              <div className="billing-receipt-row billing-receipt-items-head">
                <span>Item</span>
                <span>Qty</span>
                <span>Amount</span>
              </div>

              {selectedBill.items.map((item, index) => (
                <div className="billing-receipt-row" key={`${item.name}-${index}`}>
                  <span>{item.name}</span>
                  <span>{item.quantity}</span>
                  <span>{currency(item.price * item.quantity)}</span>
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
                    (selectedBill.subtotal - selectedBill.discount) *
                      selectedBill.taxRate /
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
          onClick={() => setPaymentBill(null)}
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
                onClick={() => setPaymentBill(null)}
                aria-label="Close payment form"
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
                onChange={(event) => setPaymentAmount(event.target.value)}
                required
              />

              <label htmlFor="billing-payment-method">
                Payment Method
              </label>
              <select
                id="billing-payment-method"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
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
                >
                  Cancel
                </button>
                <button type="submit" className="billing-primary-button">
                  Confirm Payment
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default BillingPayments;