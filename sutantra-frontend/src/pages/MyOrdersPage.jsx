import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import { getCatalogOrderStatuses, getCatalogPaymentStatuses, getOrders } from "../services/api";
import { productImageUrl } from "../utils/mediaHelpers";

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

function StatusBadge({ status, label }) {
  const s = String(status || "").toUpperCase();
  let cls = "order-status-badge";
  if (s.includes("DELIVER")) cls += " delivered";
  else if (s.includes("SHIP") || s.includes("OUT_FOR")) cls += " shipped";
  else if (s.includes("CONFIRM") || s.includes("PROCESS") || s.includes("PREPAR") || s.includes("READY")) cls += " processing";
  else if (s.includes("CANCEL")) cls += " cancelled";
  else cls += " placed";
  return <span className={cls}>{label || status || "Unknown"}</span>;
}

function PaymentBadge({ status, label }) {
  const s = String(status || "").toUpperCase();
  let cls = "order-payment-badge";
  if (s.includes("PAID") || s.includes("SUCCESS")) cls += " paid";
  else if (s.includes("FAIL")) cls += " failed";
  else if (s.includes("REFUND")) cls += " refunded";
  else cls += " pending";
  return <span className={cls}>{label || status || "Pending"}</span>;
}

function itemLabel(item) {
  return item.productName || item.name || "Product";
}

function deliverySummary(address) {
  if (!address) return "";
  const lines = String(address)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";
  return lines.slice(0, 2).join(" · ");
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderStatuses, setOrderStatuses] = useState([]);
  const [paymentStatuses, setPaymentStatuses] = useState([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getOrders(),
      getCatalogOrderStatuses().catch(() => []),
      getCatalogPaymentStatuses().catch(() => [])
    ])
      .then(([data, os, ps]) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.data || [];
        setOrders(list);
        setOrderStatuses(Array.isArray(os) ? os : os?.data || []);
        setPaymentStatuses(Array.isArray(ps) ? ps : ps?.data || []);
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load orders.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const orderLabel = useMemo(() => {
    const m = new Map();
    const aliases = new Map();
    const list = Array.isArray(orderStatuses) ? [...orderStatuses].sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)) : [];
    list.forEach((s) => {
      const code = String(s.code || "").toUpperCase();
      const label = s.label || s.display_name || s.code;
      if (code) m.set(code, label);
    });
    // Derive aliases from DB masters only (do not hardcode unrelated values)
    if (m.has("ORDER_PLACED") && !m.has("CREATED")) aliases.set("CREATED", m.get("ORDER_PLACED"));
    if (m.has("ORDER_CONFIRMED") && !m.has("CONFIRMED")) aliases.set("CONFIRMED", m.get("ORDER_CONFIRMED"));
    if (m.has("DELIVERED") && !m.has("DELIVERED")) { /* no-op */ }
    return (code) => {
      const k = String(code || "").toUpperCase();
      if (m.has(k)) return m.get(k);
      if (aliases.has(k)) return aliases.get(k);
      return code || "Unknown";
    };
  }, [orderStatuses]);

  const paymentLabel = useMemo(() => {
    const m = new Map();
    const list = Array.isArray(paymentStatuses) ? [...paymentStatuses].sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)) : [];
    list.forEach((s) => {
      const code = String(s.status_code || s.code || "").toUpperCase();
      const label = s.display_name || s.label || s.status_code || s.code;
      if (code) m.set(code, label);
    });
    return (code) => m.get(String(code || "").toUpperCase()) || code || "Pending";
  }, [paymentStatuses]);

  return (
    <main className="orders-page my-orders-page">
      <SiteHeader />

      <div className="orders-shell">
        <div className="orders-page-head">
          <div>
            <h1>My Orders</h1>
            <p className="orders-subtitle">
              {loading
                ? "Loading your orders…"
                : error
                  ? "Track and manage your orders."
                  : `${orders.length} ${orders.length === 1 ? "order" : "orders"} placed`}
            </p>
          </div>
          <Link className="orders-shop-link" to="/products">
            Continue Shopping →
          </Link>
        </div>

        {loading && <div className="orders-loading">Loading your orders…</div>}

        {!loading && error && (
          <div className="orders-error" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="orders-empty">
            <div className="orders-empty-icon">🧾</div>
            <h2>No orders yet</h2>
            <p>You haven&apos;t placed any orders yet. Start shopping to see them here.</p>
            <Link className="button button-primary" to="/products">Start Shopping</Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="orders-list">
            {orders.map((order) => {
              const items = order.items || [];
              const visibleItems = items.slice(0, 2);
              const extraCount = Math.max(0, items.length - visibleItems.length);
              const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
              const address = order.deliveryAddress || order.delivery_address;
              const addressText = deliverySummary(address);

              return (
                <article key={order.id} className="order-card">
                  <div className="order-card-main">
                    <div className="order-card-head">
                      <span className="order-number">
                        Order #{order.orderNumber || order.id}
                      </span>
                      <span className="order-date">
                        {formatDate(order.createdAt || order.created_at)}
                      </span>
                      <div className="order-card-badges">
                        <StatusBadge status={order.status} label={orderLabel(order.status)} />
                        <PaymentBadge status={order.paymentStatus || order.payment_status} label={paymentLabel(order.paymentStatus || order.payment_status)} />
                      </div>
                    </div>

                    <div className="order-items-preview">
                      {visibleItems.map((item, idx) => (
                        <div key={idx} className="order-item-preview">
                          {item.imageUrl && (
                            <img
                              src={productImageUrl(item.imageUrl)}
                              alt={itemLabel(item)}
                              className="order-item-thumb"
                              loading="lazy"
                            />
                          )}
                          <div className="order-item-preview-info">
                            <span className="order-item-preview-name" title={itemLabel(item)}>
                              {itemLabel(item)}
                            </span>
                            <span className="order-item-preview-meta">× {item.quantity}</span>
                          </div>
                        </div>
                      ))}
                      {extraCount > 0 && (
                        <span className="order-items-more">+{extraCount} more</span>
                      )}
                    </div>

                    {addressText && (
                      <p className="order-delivery-summary" title={address}>
                        <strong>Deliver to:</strong> {addressText}
                      </p>
                    )}
                  </div>

                  <div className="order-card-side">
                    <div className="order-card-total">
                      <span className="order-total-label">
                        {totalQty > 0 ? `${totalQty} ${totalQty === 1 ? "item" : "items"}` : "Total"}
                      </span>
                      <span className="order-total-amount">
                        {fmt(order.totalAmount || order.total_amount)}
                      </span>
                    </div>
                    <Link className="button button-primary order-view-btn" to={`/orders/${order.id}`}>
                      View Details
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
