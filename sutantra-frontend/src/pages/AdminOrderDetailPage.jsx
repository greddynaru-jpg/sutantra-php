import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { getAdminOrder, getAdminOrderStatuses, updateAdminOrderStatus } from "../services/api";

function fmt(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return value;
  }
}

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");
  const [statuses, setStatuses] = useState([]);
  const [statusError, setStatusError] = useState("");

  const statusLookup = useMemo(() => {
    const map = new Map();

    statuses.forEach((status) => {
      const code = String(status.code || "").toUpperCase();
      if (code) map.set(code, status);
    });

    return map;
  }, [statuses]);

  function labelFor(code) {
    const key = String(code || "").toUpperCase();
    const status = statusLookup.get(key);
    return status?.label || code || "Unknown";
  }

  function load() {
    setLoading(true);
    setError("");
    getAdminOrder(id)
      .then((data) => setOrder(data))
      .catch((err) => setError(err.message || "Unable to load order."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    let ignore = false;

    setStatusError("");
    getAdminOrderStatuses()
      .then((data) => {
        if (!ignore) setStatuses(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!ignore) setStatusError(err.message || "Unable to load status definitions.");
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function changeStatus(next) {
    if (!order) return;
    const current = (order.status || "").toUpperCase();
    if (!window.confirm(`Change order status from ${labelFor(current)} to ${labelFor(next)}?`)) {
      return;
    }
    setUpdating(true);
    setUpdateMsg("");
    setError("");
    try {
      const updated = await updateAdminOrderStatus(order.id, next);
      setOrder(updated);
      setUpdateMsg("Status updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update status.");
    } finally {
      setUpdating(false);
    }
  }

  const current = order ? (order.status || "").toUpperCase() : "";
  const allowed = order?.allowedTransitions || [];

  return (
    <AdminLayout
      title="Order Details"
      subtitle={order ? `Order #${order.orderNumber || order.order_number}` : ""}
      actions={<button className="button button-light" type="button" onClick={() => navigate("/admin/orders")}>Back to Orders</button>}
    >
      {loading && <div className="admin-panel">Loading…</div>}
      {error && <div className="admin-panel" style={{ color: "#B42318" }}>{error}</div>}
      {statusError && <div className="admin-panel" role="alert" style={{ color: "#B42318" }}>{statusError}</div>}
      {updateMsg && <div className="admin-panel" style={{ color: "#28734A" }}>{updateMsg}</div>}

      {order && !loading && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: "18px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div className="admin-panel">
              <h2 style={{ marginTop: 0 }}>Items</h2>
              {(order.items || []).map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: idx < (order.items || []).length - 1 ? "1px solid #f0ede6" : "none" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.productName || item.name}</div>
                    <div style={{ color: "var(--muted)", fontSize: "13px" }}>Qty: {item.quantity} × {fmt(item.unitPrice || item.unit_price)}</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{fmt(item.totalPrice || item.total_price)}</div>
                </div>
              ))}
              <hr style={{ border: "none", borderTop: "1px solid #EAE6DD", margin: "12px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>{fmt(order.subtotal)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Delivery</span><span>{fmt(order.deliveryCharge || order.delivery_charge)}</span></div>
                {(order.discountAmount || order.discount_amount) > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Discount</span><span>-{fmt(order.discountAmount || order.discount_amount)}</span></div>}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "16px" }}><span>Total</span><span>{fmt(order.totalAmount || order.total_amount)}</span></div>
              </div>
            </div>

            <div className="admin-panel">
              <h2 style={{ marginTop: 0 }}>Delivery Details</h2>
              <div style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>{order.deliveryAddress || order.delivery_address}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div className="admin-panel">
              <h2 style={{ marginTop: 0 }}>Order Info</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Order Number</span><strong>{order.orderNumber || order.order_number}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Date</span><span>{formatDate(order.createdAt || order.created_at)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Customer</span><span>{order.customerName || order.customer_name}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Phone</span><span>{order.customerPhone || order.customer_phone}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Payment Status</span><span>{order.paymentStatus || order.payment_status}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Status</span><span>{labelFor(current)}</span></div>
              </div>
            </div>

            <div className="admin-panel">
              <h2 style={{ marginTop: 0 }}>Update Status</h2>
              {allowed.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>No further transitions available.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {allowed.map((next) => (
                    <button key={next} className="button button-primary" type="button" disabled={updating} onClick={() => changeStatus(next)}>
                      {updating ? "Updating…" : `Mark as ${labelFor(next)}`}
                    </button>
                  ))}
                </div>
              )}
              <p style={{ color: "var(--muted)", fontSize: "12px", marginTop: "12px" }}>Payment status is not changed by fulfillment actions.</p>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
