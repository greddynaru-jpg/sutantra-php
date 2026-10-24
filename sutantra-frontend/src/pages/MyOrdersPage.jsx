import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Brand from "../components/Brand";
import { getOrders } from "../services/api";

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

function StatusBadge({ status }) {
  const s = (status || "").toUpperCase();
  const map = {
    CREATED: "Placed",
    PLACED: "Placed",
    CONFIRMED: "Confirmed",
    PROCESSING: "Processing",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled"
  };
  const label = map[s] || status || "Unknown";
  let cls = "order-status-badge";
  if (s === "DELIVERED") cls += " delivered";
  else if (s === "SHIPPED") cls += " shipped";
  else if (s === "CONFIRMED" || s === "PROCESSING") cls += " processing";
  else if (s === "CANCELLED") cls += " cancelled";
  else cls += " placed";
  return <span className={cls}>{label}</span>;
}

function PaymentBadge({ status }) {
  const s = (status || "").toUpperCase();
  let cls = "order-payment-badge";
  if (s === "PAID") cls += " paid";
  else if (s === "FAILED") cls += " failed";
  else if (s === "REFUNDED") cls += " refunded";
  else cls += " pending";
  return <span className={cls}>{status || "PENDING"}</span>;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    getOrders()
      .then((data) => {
        if (!active) return;
        // API might return paginated or plain array
        const list = Array.isArray(data) ? data : data?.data || [];
        setOrders(list);
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

  return (
    <main className="orders-page">
      <header className="orders-header">
        <Brand />
        <div className="orders-header-actions">
          <Link className="button button-light" to="/products">← Continue Shopping</Link>
        </div>
      </header>

      <div className="orders-shell">
        <div className="orders-page-head">
          <div>
            <h1>My Orders</h1>
            <p className="orders-subtitle">Track and manage your orders.</p>
          </div>
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
              const firstImage = items[0]?.imageUrl || null;
              return (
                <article key={order.id} className="order-card">
                  <div className="order-card-header">
                    <div>
                      <div className="order-card-meta-row">
                        <span className="order-number">Order #{order.orderNumber || order.id}</span>
                        <span className="order-date">{formatDate(order.createdAt || order.created_at)}</span>
                      </div>
                      <div className="order-card-badges">
                        <StatusBadge status={order.status} />
                        <PaymentBadge status={order.paymentStatus || order.payment_status} />
                      </div>
                    </div>
                    <div className="order-card-total">
                      <span className="order-total-label">Total</span>
                      <span className="order-total-amount">{fmt(order.totalAmount || order.total_amount)}</span>
                    </div>
                  </div>

                  <div className="order-card-body">
                    <div className="order-items-preview">
                      {items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="order-item-preview">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.productName || item.name} className="order-item-thumb" />
                          ) : (
                            <div className="order-item-thumb placeholder" />
                          )}
                          <div className="order-item-preview-info">
                            <div className="order-item-preview-name">{item.productName || item.name}</div>
                            <div className="order-item-preview-meta">Qty: {item.quantity}</div>
                          </div>
                        </div>
                      ))}
                      {items.length > 3 && (
                        <div className="order-items-more">+{items.length - 3} more item(s)</div>
                      )}
                    </div>
                    {(order.deliveryAddress || order.delivery_address) && (
                      <div className="order-delivery-summary">
                        <strong>Deliver to:</strong>{" "}
                        <span>{order.deliveryAddress || order.delivery_address}</span>
                      </div>
                    )}
                  </div>

                  <div className="order-card-footer">
                    <Link className="button button-primary" to={`/orders/${order.id}`}>
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
