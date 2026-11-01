
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { apiRequest } from "../../../services/api";
import "../../../styles/billing-payments.css";

const ITEMS_PER_PAGE = 10;
const ALL_BRANCHES = "all";

const PAYMENT_STATUSES = ["Paid", "Partially Paid", "Pending"];
const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Online"];

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

function getDateKey(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function unwrapResponse(response) {
  let data = response?.data ?? response;

  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    data.data !== undefined
  ) {
    data = data.data;
  }

  return data;
}

function extractArray(response, key) {
  const data = unwrapResponse(response);

  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.payments)) return data.payments;
  if (Array.isArray(data?.orders)) return data.orders;

  return [];
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    fallback
  );
}

function getId(value) {
  if (value && typeof value === "object") {
    return String(value._id || value.id || value.branchId || "");
  }

  return value == null ? "" : String(value);
}

function getBranchName(branch) {
  if (!branch || typeof branch !== "object") return "";

  return (
    branch.name ||
    branch.branchName ||
    branch.branch_name ||
    branch.branchCode ||
    branch.code ||
    ""
  );
}

function getCustomerName(value) {
  if (typeof value === "string" && value.trim()) {
    if (!/^[a-f\d]{24}$/i.test(value.trim())) {
      return value.trim();
    }
  }

  if (value && typeof value === "object") {
    const name =
      value.name || value.fullName || value.customerName || "";

    if (
      typeof name === "string" &&
      name.trim() &&
      !/^[a-f\d]{24}$/i.test(name.trim())
    ) {
      return name.trim();
    }
  }

  return "Walk-in customer";
}

function normalizeStatus(status, amountPaid, total) {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "paid") return "Paid";

  if (
    normalized === "partially paid" ||
    normalized === "partial" ||
    normalized === "partially_paid"
  ) {
    return "Partially Paid";
  }

  if (normalized === "pending") return "Pending";

  const paid = Number(amountPaid) || 0;
  const invoiceTotal = Number(total) || 0;

  if (invoiceTotal > 0 && paid >= invoiceTotal) return "Paid";
  if (paid > 0) return "Partially Paid";

  return "Pending";
}

function mapInvoice(
  invoice,
  fallbackBranchId = "",
  fallbackBranchName = ""
) {
  const rawTotal = Number(invoice?.total) || 0;
  const rawAmountPaid = Number(invoice?.amountPaid) || 0;

  const rawBranch =
    invoice?.branchId ??
    invoice?.branch ??
    invoice?.branch_id ??
    null;

  const branchId = getId(rawBranch) || fallbackBranchId;

  const branchName =
    (rawBranch && typeof rawBranch === "object"
      ? getBranchName(rawBranch)
      : "") ||
    invoice?.branchName ||
    invoice?.branch_name ||
    fallbackBranchName ||
    "Unknown Branch";

  const rawOrder =
    invoice?.orderId && typeof invoice.orderId === "object"
      ? invoice.orderId
      : null;

  const rawItems = Array.isArray(invoice?.items)
    ? invoice.items
    : Array.isArray(rawOrder?.items)
      ? rawOrder.items
      : [];

  const items = rawItems.map((item) => {
    const menuItem =
      item?.menuItemId && typeof item.menuItemId === "object"
        ? item.menuItemId
        : null;

    return {
      ...item,
      name:
        item?.name || menuItem?.name || item?.itemName || "Menu item",
      quantity: Math.max(1, Number(item?.quantity) || 1),
      price: Number(item?.price ?? item?.unitPrice) || 0,
    };
  });

  const rawTransactions = Array.isArray(invoice?.transactions)
    ? invoice.transactions
    : [];

  const orderId =
    invoice?.orderNumber ||
    rawOrder?.orderNumber ||
    (typeof invoice?.orderId === "string"
      ? invoice.orderId
      : getId(invoice?.orderId)) ||
    "—";

  return {
    ...invoice,
    id:
      invoice?.invoiceNumber ||
      invoice?.invoiceId ||
      invoice?._id ||
      "Invoice",
    orderId,
    branchId,
    branch: branchName,
    customer: getCustomerName(
      invoice?.customerName ??
        invoice?.customer ??
        rawOrder?.customerName ??
        rawOrder?.customer
    ),
    date:
      invoice?.createdAt ||
      invoice?.invoiceDate ||
      invoice?.date ||
      null,
    items,
    transactions: rawTransactions,
    subtotal: Number(invoice?.subtotal) || 0,
    discount: Number(invoice?.discount) || 0,
    taxRate: Number(invoice?.taxRate) || 0,
    total: rawTotal,
    amountPaid: rawAmountPaid,
    paymentMethod: invoice?.paymentMethod || "Not recorded",
    status: normalizeStatus(invoice?.status, rawAmountPaid, rawTotal),
  };
}

function mapOrder(order) {
  const customer = getCustomerName(
    order?.customerName ?? order?.customer
  );

  return {
    ...order,
    customer,
    orderNumber:
      order?.orderNumber ||
      (order?._id
        ? `#${String(order._id).slice(-6).toUpperCase()}`
        : "Order"),
    totalAmount: Number(order?.totalAmount ?? order?.total) || 0,
    items: Array.isArray(order?.items)
      ? order.items.map((item) => ({
          ...item,
          name:
            item?.name || item?.menuItemId?.name || "Menu item",
          quantity: Math.max(1, Number(item?.quantity) || 1),
          price: Number(item?.price ?? item?.unitPrice) || 0,
        }))
      : [],
  };
}

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

function BillingPayments({
  branchId,
  branches = [],
  branchLoading = false,
  branchError = "",
  onBranchChange,
}) {
  const [bills, setBills] = useState([]);
  const [orders, setOrders] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState(
    getId(branchId) || ALL_BRANCHES
  );
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentBill, setPaymentBill] = useState(null);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  const [invoiceBranchId, setInvoiceBranchId] = useState(
    getId(branchId) || ""
  );

  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentAmount, setPaymentAmount] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [taxRate, setTaxRate] = useState("5");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const branchOptions = useMemo(
    () => (Array.isArray(branches) ? branches : []),
    [branches]
  );

  const branchNames = useMemo(() => {
    const names = new Map();

    branchOptions.forEach((branch) => {
      const id = getId(branch);

      if (id) {
        names.set(id, getBranchName(branch) || "Unnamed Branch");
      }
    });

    return names;
  }, [branchOptions]);

  const effectiveBranchFilter = branchFilter || ALL_BRANCHES;

  const currentBranchName =
    effectiveBranchFilter === ALL_BRANCHES
      ? "All Branches"
      : branchNames.get(effectiveBranchFilter) || "Selected Branch";

  useEffect(() => {
    setBranchFilter(getId(branchId) || ALL_BRANCHES);
  }, [branchId]);

  const loadBillingData = useCallback(
    async (isActive = () => true) => {
      if (branchLoading) {
        if (isActive()) setLoading(true);
        return;
      }

      if (branchError) {
        if (isActive()) {
          setBills([]);
          setOrders([]);
          setError(branchError);
          setLoading(false);
        }
        return;
      }

      if (!branchOptions.length) {
        if (isActive()) {
          setBills([]);
          setOrders([]);
          setError("No branches are available.");
          setLoading(false);
        }
        return;
      }

      if (
        effectiveBranchFilter !== ALL_BRANCHES &&
        !branchOptions.some(
          (branch) => getId(branch) === effectiveBranchFilter
        )
      ) {
        if (isActive()) {
          setBills([]);
          setOrders([]);
          setError("The selected branch could not be found.");
          setLoading(false);
        }
        return;
      }

      if (isActive()) {
        setLoading(true);
        setError("");
      }

      try {
        const targetBranches =
          effectiveBranchFilter === ALL_BRANCHES
            ? branchOptions
            : branchOptions.filter(
                (branch) => getId(branch) === effectiveBranchFilter
              );

        const results = await Promise.all(
          targetBranches.map(async (branch) => {
            const id = getId(branch);
            const name = getBranchName(branch) || "Unnamed Branch";

            if (!id) {
              throw new Error(
                "A branch is missing its ID. Refresh the branch list."
              );
            }

            const [invoiceResponse, orderResponse] = await Promise.all([
              apiRequest(`/api/payments/${encodeURIComponent(id)}`),
              apiRequest(`/api/orders/${encodeURIComponent(id)}`),
            ]);

            return {
              branchId: id,
              branchName: name,
              invoices: extractArray(invoiceResponse, "invoices"),
              orders: extractArray(orderResponse, "orders"),
            };
          })
        );

        if (!isActive()) return;

        const invoiceMap = new Map();
        const orderMap = new Map();

        results.forEach((result) => {
          result.invoices.forEach((invoice) => {
            const mapped = mapInvoice(
              invoice,
              result.branchId,
              result.branchName
            );

            const uniqueKey = `${result.branchId}:${
              getId(invoice) || mapped.id
            }`;

            invoiceMap.set(uniqueKey, mapped);
          });

          result.orders.forEach((order) => {
            const mapped = {
              ...mapOrder(order),
              branchId: result.branchId,
              branchName: result.branchName,
            };

            orderMap.set(`${result.branchId}:${getId(order)}`, mapped);
          });
        });

        setBills(
          Array.from(invoiceMap.values()).sort(
            (a, b) =>
              new Date(b.date || 0).getTime() -
              new Date(a.date || 0).getTime()
          )
        );

        setOrders(Array.from(orderMap.values()));
        setError("");
      } catch (requestError) {
        if (isActive()) {
          setBills([]);
          setOrders([]);
          setError(
            getErrorMessage(
              requestError,
              "Unable to load invoices and orders. Please try again."
            )
          );
        }
      } finally {
        if (isActive()) setLoading(false);
      }
    },
    [
      branchOptions,
      branchLoading,
      branchError,
      effectiveBranchFilter,
    ]
  );

  useEffect(() => {
    let active = true;

    loadBillingData(() => active);

    return () => {
      active = false;
    };
  }, [loadBillingData, refreshKey]);

  const invoicedOrderIds = useMemo(
    () =>
      new Set(
        bills.map((bill) => {
          const orderReference =
            typeof bill.orderId === "string"
              ? bill.orderId
              : getId(bill.orderId);

          return `${bill.branchId}:${String(orderReference)}`;
        })
      ),
    [bills]
  );

  const availableOrders = useMemo(
    () =>
      orders.filter((order) => {
        const status = String(order.status || "").toLowerCase();
        const cancelled = status === "cancelled" || status === "canceled";

        const orderId = getId(order);
        const orderNumber = String(order.orderNumber || "");

        const alreadyInvoiced =
          invoicedOrderIds.has(`${order.branchId}:${orderId}`) ||
          invoicedOrderIds.has(`${order.branchId}:${orderNumber}`);

        return (
          !cancelled &&
          !alreadyInvoiced &&
          Boolean(orderId) &&
          (effectiveBranchFilter === ALL_BRANCHES ||
            order.branchId === effectiveBranchFilter)
        );
      }),
    [orders, invoicedOrderIds, effectiveBranchFilter]
  );

  const filteredBills = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bills.filter((bill) => {
      const searchableText = [
        bill.id,
        bill.orderId,
        bill.customer,
        bill.branch,
        bill.status,
      ]
        .map((value) => String(value || ""))
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchableText.includes(query)) &&
        (statusFilter === "All" || bill.status === statusFilter) &&
        (effectiveBranchFilter === ALL_BRANCHES ||
          bill.branchId === effectiveBranchFilter) &&
        (!dateFilter || getDateKey(bill.date) === dateFilter)
      );
    });
  }, [
    bills,
    search,
    statusFilter,
    effectiveBranchFilter,
    dateFilter,
  ]);

  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);

  const safeCurrentPage = Math.min(
    currentPage,
    Math.max(1, totalPages)
  );

  const paginatedBills = useMemo(
    () =>
      filteredBills.slice(
        (safeCurrentPage - 1) * ITEMS_PER_PAGE,
        safeCurrentPage * ITEMS_PER_PAGE
      ),
    [filteredBills, safeCurrentPage]
  );

  const paginationPages = getPaginationPages(
    safeCurrentPage,
    totalPages
  );

  const pageStart =
    filteredBills.length === 0
      ? 0
      : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;

  const pageEnd = Math.min(
    safeCurrentPage * ITEMS_PER_PAGE,
    filteredBills.length
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, effectiveBranchFilter, dateFilter]);

  useEffect(() => {
    if (!selectedBill) return;

    const updated = bills.find(
      (bill) =>
        String(bill._id || bill.id) ===
          String(selectedBill._id || selectedBill.id) &&
        bill.branchId === selectedBill.branchId
    );

    if (updated && updated !== selectedBill) {
      setSelectedBill(updated);
    }
  }, [bills, selectedBill]);

  const handleBranchChange = (value) => {
    setBranchFilter(value);
    setSearch("");
    setStatusFilter("All");
    setDateFilter("");
    setCurrentPage(1);
    setError("");
    setSuccessMessage("");

    onBranchChange?.(value);
  };

  const refreshBilling = () => {
    setError("");
    setRefreshKey((current) => current + 1);
  };

  const openDeleteConfirmation = (bill) => {
    if (saving || deletingInvoiceId) return;

    const invoiceId = getId(bill?._id);
    const branchIdForInvoice = getId(bill?.branchId);

    if (!invoiceId || !branchIdForInvoice) {
      setError(
        "Cannot delete this invoice because its invoice ID or branch ID is missing."
      );
      return;
    }

    setError("");
    setSuccessMessage("");
    setInvoiceToDelete(bill);
  };

  const deleteInvoice = async () => {
    if (!invoiceToDelete || saving || deletingInvoiceId) return;

    const bill = invoiceToDelete;
    const invoiceId = getId(bill._id);
    const branchIdForInvoice = getId(bill.branchId);

    if (!invoiceId || !branchIdForInvoice) {
      setError("Invoice ID or branch ID is missing.");
      setInvoiceToDelete(null);
      return;
    }

    setDeletingInvoiceId(invoiceId);
    setError("");
    setSuccessMessage("");

    try {
      await apiRequest(
        `/api/payments/${encodeURIComponent(
          branchIdForInvoice
        )}/${encodeURIComponent(invoiceId)}`,
        {
          method: "DELETE",
        }
      );

      setBills((currentBills) =>
        currentBills.filter(
          (item) =>
            !(
              getId(item?._id) === invoiceId &&
              getId(item?.branchId) === branchIdForInvoice
            )
        )
      );

      setSelectedBill((current) =>
        current &&
        getId(current?._id) === invoiceId &&
        getId(current?.branchId) === branchIdForInvoice
          ? null
          : current
      );

      setPaymentBill((current) =>
        current &&
        getId(current?._id) === invoiceId &&
        getId(current?.branchId) === branchIdForInvoice
          ? null
          : current
      );

      setInvoiceToDelete(null);
      setSuccessMessage(`Invoice ${bill.id} deleted successfully.`);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Unable to delete the invoice. Please try again."
        )
      );
    } finally {
      setDeletingInvoiceId("");
    }
  };

  const closeCreateInvoice = () => {
    if (saving) return;

    setShowCreateInvoice(false);
    setSelectedOrderId("");
    setInvoiceBranchId("");
    setDiscount("0");
    setTaxRate("5");
  };

  const openCreateInvoice = () => {
    setError("");
    setSuccessMessage("");
    setSelectedOrderId("");
    setDiscount("0");
    setTaxRate("5");

    setInvoiceBranchId(
      effectiveBranchFilter !== ALL_BRANCHES
        ? effectiveBranchFilter
        : ""
    );

    setShowCreateInvoice(true);
  };

  const createInvoice = async (event) => {
    event.preventDefault();

    if (!invoiceBranchId || invoiceBranchId === ALL_BRANCHES) {
      setError("Please select a branch for the invoice.");
      return;
    }

    if (!selectedOrderId) {
      setError("Please select an order.");
      return;
    }

    const selectedOrder = availableOrders.find(
      (order) =>
        getId(order) === selectedOrderId &&
        order.branchId === invoiceBranchId
    );

    if (!selectedOrder) {
      setError(
        "The selected order does not belong to the selected branch."
      );
      return;
    }

    const numericDiscount = Number(discount);
    const numericTaxRate = Number(taxRate);

    const orderSubtotal = selectedOrder.items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    if (
      !Number.isFinite(numericDiscount) ||
      numericDiscount < 0 ||
      numericDiscount > orderSubtotal ||
      !Number.isFinite(numericTaxRate) ||
      numericTaxRate < 0 ||
      numericTaxRate > 100
    ) {
      setError(
        "Enter a valid discount and tax rate. The discount cannot exceed the order subtotal."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await apiRequest("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          branchId: invoiceBranchId,
          orderId: selectedOrderId,
          discount: numericDiscount,
          taxRate: numericTaxRate,
        }),
      });

      const invoiceData = unwrapResponse(response);
      const invoice =
        invoiceData?.invoice ||
        invoiceData?.data?.invoice ||
        invoiceData;

      if (!invoice || typeof invoice !== "object") {
        throw new Error("The server did not return the created invoice.");
      }

      const mappedInvoice = mapInvoice(
        invoice,
        invoiceBranchId,
        branchNames.get(invoiceBranchId) || "Selected Branch"
      );

      setBills((currentBills) => [
        mappedInvoice,
        ...currentBills.filter(
          (bill) =>
            String(bill._id || bill.id) !==
              String(mappedInvoice._id || mappedInvoice.id) ||
            bill.branchId !== mappedInvoice.branchId
        ),
      ]);

      setShowCreateInvoice(false);
      setSelectedOrderId("");
      setInvoiceBranchId("");
      setDiscount("0");
      setTaxRate("5");
      setCurrentPage(1);

      setSuccessMessage(`${mappedInvoice.id} created successfully.`);
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Unable to create the invoice.")
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

  const recordPayment = async (event) => {
    event.preventDefault();

    if (!paymentBill) return;

    const paymentBranchId = paymentBill.branchId;

    if (!paymentBranchId) {
      setError("The invoice branch could not be identified.");
      return;
    }

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
      const response = await apiRequest(
        `/api/payments/${encodeURIComponent(
          paymentBranchId
        )}/${encodeURIComponent(paymentBill._id)}/payments`,
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            method: paymentMethod,
          }),
        }
      );

      const responseData = unwrapResponse(response);
      const updatedInvoice =
        responseData?.invoice ||
        responseData?.data?.invoice ||
        responseData;

      if (!updatedInvoice || typeof updatedInvoice !== "object") {
        throw new Error("The server did not return the updated invoice.");
      }

      const mappedInvoice = mapInvoice(
        updatedInvoice,
        paymentBranchId,
        branchNames.get(paymentBranchId) || paymentBill.branch
      );

      setBills((currentBills) =>
        currentBills.map((bill) =>
          String(bill._id || bill.id) ===
            String(mappedInvoice._id || mappedInvoice.id) &&
          bill.branchId === paymentBranchId
            ? mappedInvoice
            : bill
        )
      );

      setSelectedBill((currentBill) =>
        currentBill &&
        String(currentBill._id || currentBill.id) ===
          String(mappedInvoice._id || mappedInvoice.id) &&
        currentBill.branchId === paymentBranchId
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
        getErrorMessage(requestError, "Unable to record the payment.")
      );
    } finally {
      setSaving(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  const selectedOrder = availableOrders.find(
    (order) =>
      getId(order) === selectedOrderId &&
      order.branchId === invoiceBranchId
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
        <div className="billing-page-title">
          <p className="billing-subtitle">
            Manage invoices, track outstanding balances, and record payments.
          </p>
        </div>

        <div className="billing-header-actions">
          <button
            type="button"
            className="billing-primary-button"
            onClick={openCreateInvoice}
            disabled={loading || branchLoading || !branchOptions.length}
            title="Create an invoice from an existing order"
          >
            + Create Invoice
          </button>

          <button
            type="button"
            className="billing-secondary-button"
            onClick={refreshBilling}
            disabled={
              loading ||
              branchLoading ||
              saving ||
              Boolean(deletingInvoiceId)
            }
          >
            <RefreshCw
              size={15}
              className={loading ? "billing-spin" : ""}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      </header>

      {(error || branchError) && (
        <div className="billing-alert billing-alert-error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error || branchError}</span>

          <button
            type="button"
            onClick={() => {
              setError("");
              if (branchError) refreshBilling();
            }}
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="billing-alert billing-alert-success" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{successMessage}</span>

          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            aria-label="Dismiss success message"
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="billing-table-section">
        <section className="billing-filter-card" aria-label="Invoice filters">
          <div className="billing-toolbar">
            <label className="billing-search">
              <Search size={17} aria-hidden="true" />

              <input
                type="search"
                placeholder="Search invoice, order or customer..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search invoices"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </label>

            <label className="billing-filter">
              <span>Branch</span>

              <select
                value={effectiveBranchFilter}
                onChange={(event) => handleBranchChange(event.target.value)}
                disabled={
                  branchLoading ||
                  Boolean(branchError) ||
                  !branchOptions.length
                }
                aria-label="Filter by branch"
              >
                <option value={ALL_BRANCHES}>All Branches</option>

                {branchOptions.map((branch) => {
                  const id = getId(branch);
                  if (!id) return null;

                  return (
                    <option key={id} value={id}>
                      {getBranchName(branch) || id}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="billing-filter">
              <span>Payment status</span>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by payment status"
              >
                <option value="All">All statuses</option>

                {PAYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="billing-filter">
              <span>Invoice date</span>

              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                aria-label="Filter by invoice date"
              />
            </label>
          </div>
        </section>

        <section className="billing-table-card">
          <div className="billing-section-heading">
            <div>
              <h2>Invoices &amp; Transactions</h2>
              <p>
                {filteredBills.length}{" "}
                {filteredBills.length === 1 ? "record" : "records"} found
              </p>
            </div>

            <span className="billing-header-badge">
              {currentBranchName}
            </span>
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
                {loading || branchLoading ? (
                  <tr>
                    <td colSpan={7} className="billing-empty">
                      <LoaderCircle
                        size={22}
                        className="billing-spin"
                        aria-hidden="true"
                      />
                      <strong>Loading billing records...</strong>
                    </td>
                  </tr>
                ) : error || branchError ? (
                  <tr>
                    <td colSpan={7} className="billing-empty">
                      <AlertCircle size={24} aria-hidden="true" />
                      <strong>Billing records could not be loaded.</strong>
                      <p>{error || branchError}</p>

                      <button
                        type="button"
                        className="billing-secondary-button"
                        onClick={refreshBilling}
                      >
                        <RefreshCw size={14} />
                        Try Again
                      </button>
                    </td>
                  </tr>
                ) : paginatedBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="billing-empty">
                      <Search size={24} aria-hidden="true" />

                      <strong>
                        {bills.length
                          ? "No matching invoices"
                          : "No invoices found"}
                      </strong>

                      <p>
                        {bills.length
                          ? "Try changing your search or adjusting the filters."
                          : "Create an invoice from an existing order to get started."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedBills.map((bill) => {
                    const balance = Math.max(
                      bill.total - bill.amountPaid,
                      0
                    );

                    const invoiceDatabaseId = getId(bill._id);
                    const isDeleting =
                      deletingInvoiceId === invoiceDatabaseId;

                    return (
                      <tr key={`${bill.branchId}:${bill._id || bill.id}`}>
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
                          <span className="billing-branch">{bill.branch}</span>
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
                              disabled={Boolean(deletingInvoiceId)}
                            >
                              View
                            </button>

                            {balance > 0 && (
                              <button
                                type="button"
                                className="billing-pay-button"
                                onClick={() => openPaymentForm(bill)}
                                disabled={Boolean(deletingInvoiceId)}
                              >
                                Pay
                              </button>
                            )}

                            <button
                              type="button"
                              className="billing-delete-button"
                              onClick={() => openDeleteConfirmation(bill)}
                              disabled={
                                saving ||
                                Boolean(deletingInvoiceId) ||
                                !invoiceDatabaseId
                              }
                              title="Delete invoice"
                              aria-label={`Delete invoice ${bill.id}`}
                            >
                              {isDeleting ? (
                                <LoaderCircle
                                  size={16}
                                  className="billing-spin"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Trash2 size={16} aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading &&
            !error &&
            !branchError &&
            filteredBills.length > 0 && (
              <div className="billing-pagination">
                <span className="billing-pagination-info">
                  Showing {pageStart}–{pageEnd} of {filteredBills.length} invoices
                </span>

                <div className="billing-pagination-buttons">
                  <button
                    type="button"
                    className="billing-pagination-button"
                    disabled={safeCurrentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>

                  {paginationPages.map((page, index) =>
                    page === "..." ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="billing-pagination-ellipsis"
                        aria-hidden="true"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        className={`billing-pagination-button ${
                          safeCurrentPage === page ? "active" : ""
                        }`}
                        onClick={() => setCurrentPage(page)}
                        aria-current={
                          safeCurrentPage === page ? "page" : undefined
                        }
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    className="billing-pagination-button"
                    disabled={
                      totalPages === 0 || safeCurrentPage === totalPages
                    }
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
        </section>
      </section>

      {/* Invoice details modal */}
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
                  <span>{currency(item.price * item.quantity)}</span>
                </div>
              ))}

              {selectedBill.items.length === 0 && (
                <p>No invoice item details available.</p>
              )}
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
                    (Math.max(
                      selectedBill.subtotal - selectedBill.discount,
                      0
                    ) *
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

                {selectedBill.transactions.map((transaction, index) => (
                  <div
                    className="billing-transaction-row"
                    key={
                      transaction._id ||
                      `${transaction.transactionDate}-${index}`
                    }
                  >
                    <div>
                      <strong>{transaction.method || "Payment"}</strong>
                      <span>
                        {formatDate(
                          transaction.transactionDate || transaction.createdAt
                        )}
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
                onClick={printReceipt}
              >
                <Printer size={15} aria-hidden="true" />
                Print Receipt
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Record payment modal */}
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
                <span>Branch</span>
                <strong>{paymentBill.branch}</strong>
              </div>

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
              <label htmlFor="billing-payment-amount">Payment Amount (₹)</label>
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
                disabled={saving}
              />

              <label htmlFor="billing-payment-method">Payment Method</label>
              <select
                id="billing-payment-method"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                disabled={saving}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method === "Online" ? "Online Payment" : method}
                  </option>
                ))}
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

      {/* Create invoice modal */}
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
                <h2 id="billing-create-invoice-title">Create Invoice</h2>
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

            <form onSubmit={createInvoice}>
              <label htmlFor="billing-invoice-branch">Select Branch</label>

              <select
                id="billing-invoice-branch"
                value={invoiceBranchId}
                onChange={(event) => {
                  setInvoiceBranchId(event.target.value);
                  setSelectedOrderId("");
                  setError("");
                }}
                required
                disabled={
                  saving ||
                  branchLoading ||
                  Boolean(branchError) ||
                  !branchOptions.length
                }
              >
                <option value="">Choose a branch...</option>

                {branchOptions.map((branch) => {
                  const id = getId(branch);
                  if (!id) return null;

                  return (
                    <option key={id} value={id}>
                      {getBranchName(branch) || id}
                    </option>
                  );
                })}
              </select>

              {!invoiceBranchId && (
                <p className="billing-form-hint">
                  Select a branch to view its available orders.
                </p>
              )}

              <label htmlFor="billing-order-select">Select Order</label>

              <select
                id="billing-order-select"
                value={selectedOrderId}
                onChange={(event) => setSelectedOrderId(event.target.value)}
                required
                disabled={
                  saving ||
                  !invoiceBranchId ||
                  loading ||
                  branchLoading
                }
              >
                <option value="">
                  {!invoiceBranchId
                    ? "Select a branch first..."
                    : availableOrders.some(
                          (order) => order.branchId === invoiceBranchId
                        )
                      ? "Choose an order..."
                      : "No eligible orders for this branch"}
                </option>

                {availableOrders
                  .filter((order) => order.branchId === invoiceBranchId)
                  .map((order) => (
                    <option
                      key={`${order.branchId}:${getId(order)}`}
                      value={getId(order)}
                    >
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
                    <span>Branch</span>
                    <strong>
                      {branchNames.get(invoiceBranchId) ||
                        selectedOrder.branchName ||
                        "Selected Branch"}
                    </strong>
                  </div>

                  <div>
                    <span>Order status</span>
                    <strong>{selectedOrder.status || "—"}</strong>
                  </div>

                  <div>
                    <span>Order subtotal</span>
                    <strong>{currency(selectedOrderSubtotal)}</strong>
                  </div>
                </div>
              )}

              <label htmlFor="billing-invoice-discount">Discount (₹)</label>
              <input
                id="billing-invoice-discount"
                type="number"
                min="0"
                max={selectedOrderSubtotal}
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
                disabled={saving || !selectedOrder}
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
                disabled={saving || !selectedOrder}
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
                  disabled={
                    saving ||
                    !invoiceBranchId ||
                    !selectedOrderId ||
                    !selectedOrder
                  }
                >
                  {saving ? "Creating..." : "Create Invoice"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Delete invoice confirmation modal */}
      {invoiceToDelete && (
        <div
          className="billing-modal-overlay billing-confirm-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deletingInvoiceId
            ) {
              setInvoiceToDelete(null);
            }
          }}
        >
          <section
            className="billing-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="billing-delete-title"
            aria-describedby="billing-delete-description"
          >
            <div className="billing-confirm-icon">
              <Trash2 size={23} aria-hidden="true" />
            </div>

            <h2 id="billing-delete-title">Delete Invoice?</h2>

            <p id="billing-delete-description">
              Are you sure you want to delete invoice{" "}
              <strong>{invoiceToDelete.id}</strong> for{" "}
              <strong>{invoiceToDelete.customer}</strong>? This action
              cannot be undone.
            </p>

            <div className="billing-confirm-actions">
              <button
                type="button"
                className="billing-secondary-button"
                onClick={() => setInvoiceToDelete(null)}
                disabled={Boolean(deletingInvoiceId)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="billing-danger-button"
                onClick={deleteInvoice}
                disabled={Boolean(deletingInvoiceId)}
              >
                {deletingInvoiceId ? (
                  <>
                    <LoaderCircle
                      size={16}
                      className="billing-spin"
                      aria-hidden="true"
                    />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} aria-hidden="true" />
                    Delete Invoice
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default BillingPayments;
