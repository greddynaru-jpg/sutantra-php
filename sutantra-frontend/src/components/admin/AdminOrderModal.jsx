import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getAdminOrder, updateAdminOrderStatus } from "../../services/api";
import { formatCurrency } from "../../utils/orderStatus";
import { CloseIcon, PrinterIcon } from "./AdminOrderActionIcons";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(value);
  }
}

function text(value, fallback = "—") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function addressLines(value) {
  return String(value ?? "")
    .replace(/\r\n|\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function totalRow(label, value, strong = false) {
  return (
    <div className={`admin-order-print-total-row${strong ? " is-grand" : ""}`}>
      <span>{label}</span>
      <span>{formatCurrency(value, 2)}</span>
    </div>
  );
}

export default function AdminOrderModal({ orderId, orderNumber, mode = "view", statuses = [], onUpdated, onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");
  const [actionError, setActionError] = useState("");

  const isPrint = mode === "print";

  const statusLookup = useMemo(() => {
    const map = new Map();
    const list = Array.isArray(statuses) ? [...statuses].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) : [];
    list.forEach((status) => {
      const code = String(status.code || "").toUpperCase();
      if (code) map.set(code, status);
    });
    return map;
  }, [statuses]);

  function labelFor(code) {
    const key = String(code || "").toUpperCase();
    const status = statusLookup.get(key);
    if (status?.label || status?.display_name) return status.label || status.display_name;
    if (key === "CREATED" && statusLookup.has("ORDER_PLACED")) {
      const target = statusLookup.get("ORDER_PLACED");
      return target?.label || target?.display_name || "Order Placed";
    }
    if (key === "CONFIRMED" && statusLookup.has("ORDER_CONFIRMED")) {
      const target = statusLookup.get("ORDER_CONFIRMED");
      return target?.label || target?.display_name || "Order Confirmed";
    }
    return code || "Unknown";
  }

  async function changeStatus(next) {
    if (!order || updating) return;
    const current = (order.status || "").toUpperCase();
    if (!window.confirm(`Change order status from ${labelFor(current)} to ${labelFor(next)}?`)) return;

    setUpdating(true);
    setUpdateMsg("");
    setActionError("");
    try {
      const updated = await updateAdminOrderStatus(order.id, next);
      setOrder(updated);
      setUpdateMsg("Status updated successfully.");
      onUpdated?.();
    } catch (err) {
      setActionError(err.message || "Failed to update status.");
    } finally {
      setUpdating(false);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setOrder(null);

    getAdminOrder(orderId)
      .then((data) => {
        if (active) setOrder(data);
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load this order.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const items = Array.isArray(order?.items) ? order.items : [];
  const lines = addressLines(order?.deliveryAddress);
  const number = text(order?.orderNumber || orderNumber, "—");
  const title = isPrint ? "Order Document" : "Order Details";

  return createPortal(
    <div
      className="admin-order-print-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="admin-order-print-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${title} · ${number}`}
      >
        <div className="admin-order-print-toolbar">
          <strong>{title} · {number}</strong>
          <div className="admin-order-print-toolbar-actions">
            {isPrint && (
              <button
                className="button button-primary"
                type="button"
                onClick={() => window.print()}
                disabled={loading || Boolean(error)}
                aria-label={`Print order ${number}`}
              >
                <PrinterIcon size={15} />
                Print Order
              </button>
            )}
            <button
              className="button button-light"
              type="button"
              onClick={onClose}
              aria-label={`Close ${title.toLowerCase()}`}
            >
              <CloseIcon />
              Close
            </button>
          </div>
        </div>

        <div className="admin-order-print-body">
          {loading && <p className="admin-order-print-status" role="status">Loading order…</p>}
          {!loading && error && (
            <div className="admin-order-print-status is-error" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && order && (
            <article className="admin-order-print-sheet" aria-label={`Order ${number}`}>
              <header className="admin-order-print-head">
                <div>
                  <div className="admin-order-print-brand">SUTANTRA</div>
                  <div className="admin-order-print-subtitle">{title}</div>
                </div>
                <div className="admin-order-print-meta">
                  <div>Order: <strong>{number}</strong></div>
                  <div>Date: {formatDate(order.createdAt)}</div>
                  <div>Payment: <strong>{text(order.paymentStatusDisplayName || order.paymentStatus)}</strong></div>
                  <div>Status: <strong>{text(order.statusDisplayName || order.status)}</strong></div>
                </div>
              </header>

              <section className="admin-order-print-section">
                <h3>Customer</h3>
                <div className="admin-order-print-columns">
                  <div>
                    <div className="admin-order-print-value">{text(order.customerName)}</div>
                    {text(order.customerEmail, "") && <div className="admin-order-print-muted">{order.customerEmail}</div>}
                    <div className="admin-order-print-muted">Phone: {text(order.customerPhone)}</div>
                  </div>
                  <div>
                    <h4>Deliver to</h4>
                    {lines.length > 0 ? (
                      lines.map((line, index) => (
                        <div key={index} className="admin-order-print-muted">{line}</div>
                      ))
                    ) : (
                      <div className="admin-order-print-muted">Delivery address not recorded.</div>
                    )}
                  </div>
                </div>
              </section>

              <section className="admin-order-print-section">
                <h3>Products</h3>
                {items.length === 0 ? (
                  <p className="admin-order-print-muted">No items recorded for this order.</p>
                ) : (
                  <table className="admin-order-print-table">
                    <thead>
                      <tr>
                        <th scope="col">Description</th>
                        <th scope="col">Qty</th>
                        <th scope="col">Unit Price</th>
                        <th scope="col">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <div className="admin-order-print-value">{text(item.productName || item.name, "Item")}</div>
                            {text(item.unit, "") && <div className="admin-order-print-muted">Unit: {item.unit}</div>}
                          </td>
                          <td>{Number(item.quantity ?? 0)}</td>
                          <td className="admin-order-print-num">{formatCurrency(item.unitPrice ?? item.unit_price, 2)}</td>
                          <td className="admin-order-print-num">{formatCurrency(item.totalPrice ?? item.total_price, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              <section className="admin-order-print-section admin-order-print-totals">
                {totalRow("Subtotal", order.subtotal)}
                {totalRow("Delivery Charge", order.deliveryCharge)}
                {totalRow("Discount", -(Number(order.discountAmount) || 0))}
                {totalRow("Tax", order.taxAmount)}
                {totalRow("Total", order.totalAmount, true)}
              </section>

              {!isPrint && (
                <section className="admin-order-print-section">
                  <h3>Update Status</h3>
                  {updateMsg && (
                    <p style={{ color: "#28734A", fontSize: 12, margin: "0 0 10px" }}>{updateMsg}</p>
                  )}
                  {actionError && (
                    <p role="alert" style={{ color: "#B42318", fontSize: 12, margin: "0 0 10px" }}>
                      {actionError}
                    </p>
                  )}
                  {(Array.isArray(order.allowedTransitions) ? order.allowedTransitions : []).length === 0 ? (
                    <p className="admin-order-print-muted">No further transitions available.</p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {order.allowedTransitions.map((next) => (
                        <button
                          key={next}
                          className="button button-primary"
                          type="button"
                          disabled={updating}
                          onClick={() => changeStatus(next)}
                          style={{ minHeight: 34, padding: "0 12px", fontSize: 12 }}
                        >
                          {updating ? "Updating…" : `Mark as ${labelFor(next)}`}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="admin-order-print-muted" style={{ marginTop: 12 }}>
                    Payment status is not changed by fulfilment actions.
                  </p>
                </section>
              )}

              <footer className="admin-order-print-footer">
                System-generated order document for SUTANTRA administration.
              </footer>
            </article>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
