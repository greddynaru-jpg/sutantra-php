import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Brand from "../components/Brand";
import { getOrder } from "../services/api";

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

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    getOrder(id)
      .then((data) => {
        if (!active) return;
        setOrder(data);
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load order details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <main className="orders-page">
      <header className="orders-header">
        <Brand />
        <div className="orders-header-actions">
          <button className="button button-light" type="button" onClick={() => navigate("/orders")}>
            ← Back to My Orders
          </button>
        </div>
      </header>

      <div className="orders-shell">
        <div className="order-detail-head">
          <div>
            <h1>Order Details</h1>
            {order && (
              <p className="orders-subtitle">
                Order #{order.orderNumber || order.order_number || order.id} • {formatDate(order.createdAt || order.created_at)}
              </p>
            )}
          </div>
          {order && (
            <div className="order-detail-badges">
              <StatusBadge status={order.status} />
              <PaymentBadge status={order.paymentStatus || order.payment_status} />
            </div>
          )}
        </div>

        {loading && <div className="orders-loading">Loading order details…</div>}

        {!loading && error && (
          <div className="orders-error" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && order && (
          <div className="order-detail-layout">
            <section className="order-detail-panel">
              <h2>Items</h2>
              <div className="order-detail-items">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="order-detail-item">
                    <div className="order-detail-item-main">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName || item.name} className="order-detail-thumb" />
                      ) : (
                        <div className="order-detail-thumb placeholder" />
                      )}
                      <div className="order-detail-item-info">
                        <div className="order-detail-item-name">{item.productName || item.name}</div>
                        {item.unit && <div className="order-detail-item-unit">Unit: {item.unit}</div>}
                        <div className="order-detail-item-meta">Qty: {item.quantity} × {fmt(item.unitPrice || item.unit_price)}</div>
                      </div>
                    </div>
                    <div className="order-detail-item-total">{fmt(item.totalPrice || item.total_price || (item.quantity * (item.unitPrice || item.unit_price)))}</div>
                  </div>
                ))}
              </div>

              <div className="order-detail-totals">
                <div className="order-detail-total-row">
                  <span>Subtotal</span>
                  <span>{fmt(order.subtotal || order.subtotalAmount)}</span>
                </div>
                <div className="order-detail-total-row">
                  <span>Delivery Charge</span>
                  <span>{fmt(order.deliveryCharge || order.delivery_charge || 0)}</span>
                </div>
                {(order.discountAmount || order.discount_amount) > 0 && (
                  <div className="order-detail-total-row">
                    <span>Discount</span>
                    <span>-{fmt(order.discountAmount || order.discount_amount)}</span>
                  </div>
                )}
                {(order.taxAmount || order.tax_amount) > 0 && (
                  <div className="order-detail-total-row">
                    <span>Tax</span>
                    <span>{fmt(order.taxAmount || order.tax_amount)}</span>
                  </div>
                )}
                <hr className="order-detail-divider" />
                <div className="order-detail-total-row grand">
                  <span>Total</span>
                  <span>{fmt(order.totalAmount || order.total_amount)}</span>
                </div>
              </div>
            </section>

            <aside className="order-detail-sidebar">
              <section className="order-detail-panel compact">
                <h2>Order Info</h2>
                <dl className="order-detail-facts">
                  <div>
                    <dt>Order Number</dt>
                    <dd>{order.orderNumber || order.order_number}</dd>
                  </div>
                  <div>
                    <dt>Order Date</dt>
                    <dd>{formatDate(order.createdAt || order.created_at)}</dd>
                  </div>
                  <div>
                    <dt>Order Status</dt>
                    <dd><StatusBadge status={order.status} /></dd>
                  </div>
                  <div>
                    <dt>Payment Status</dt>
                    <dd><PaymentBadge status={order.paymentStatus || order.payment_status} /></dd>
                  </div>
                  {(order.paymentMethod || order.payment_method) && (
                    <div>
                      <dt>Payment Method</dt>
                      <dd>{order.paymentMethod || order.payment_method}</dd>
                    </div>
                  )}
                </dl>
              </section>

              {(order.deliveryAddress || order.delivery_address) && (
                <section className="order-detail-panel compact">
                  <h2>Delivery Address</h2>
                  <div className="order-delivery-address">{order.deliveryAddress || order.delivery_address}</div>
                </section>
              )}

              {(order.trackingNumber || order.tracking_number || order.trackingUrl || order.tracking_url) && (
                <section className="order-detail-panel compact">
                  <h2>Tracking</h2>
                  {(order.trackingNumber || order.tracking_number) && (
                    <div className="order-tracking-row">
                      <span>Tracking Number:</span>
                      <strong>{order.trackingNumber || order.tracking_number}</strong>
                    </div>
                  )}
                  {(order.trackingUrl || order.tracking_url) && (
                    <a className="button button-outline button-wide" href={order.trackingUrl || order.tracking_url} target="_blank" rel="noopener noreferrer">
                      Track Shipment
                    </a>
                  )}
                </section>
              )}
            </aside>
          </div>
        )}

        {!loading && !error && !order && (
          <div className="orders-empty">
            <h2>Order not found</h2>
            <p>We couldn&apos;t find this order.</p>
            <Link className="button button-primary" to="/orders">Back to My Orders</Link>
          </div>
        )}
      </div>
    </main>
  );
}
