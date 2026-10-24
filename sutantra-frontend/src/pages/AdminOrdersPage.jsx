import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { getAdminOrders } from "../services/api";

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
    CREATED: "Pending Approval",
    CONFIRMED: "Approved",
    PROCESSING: "Processing",
    SHIPPED: "Dispatched",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled"
  };
  const label = map[s] || status || "Unknown";
  let cls = "admin-badge";
  if (s === "DELIVERED") cls += " ok";
  else if (s === "SHIPPED") cls += " ok";
  else if (s === "CONFIRMED" || s === "PROCESSING") cls += " role-admin";
  else if (s === "CANCELLED") cls += " off";
  else cls += " role-user";
  return <span className={cls}>{label}</span>;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, dispatched: 0, delivered: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  function load() {
    setLoading(true);
    setError("");
    getAdminOrders({ search, status })
      .then((res) => {
        const data = res?.data?.data || res?.data || [];
        setOrders(Array.isArray(data) ? data : []);
        if (res?.stats) setStats(res.stats);
        else if (res?.data?.stats) setStats(res.data.stats);
      })
      .catch((err) => setError(err.message || "Unable to load orders."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function applyFilters(e) {
    e.preventDefault();
    load();
  }

  return (
    <AdminLayout
      title="Order Management"
      subtitle="View and manage customer orders."
      actions={<Link className="button button-light" to="/admin">Back to Dashboard</Link>}
    >
      <div className="admin-module-grid">
        <div className="admin-panel"><h2 style={{ margin: "0 0 6px" }}>Total Orders</h2><div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{stats.total}</div></div>
        <div className="admin-panel"><h2 style={{ margin: "0 0 6px" }}>Pending Approval</h2><div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{stats.pending}</div></div>
        <div className="admin-panel"><h2 style={{ margin: "0 0 6px" }}>Approved / Confirmed</h2><div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{stats.confirmed}</div></div>
        <div className="admin-panel"><h2 style={{ margin: "0 0 6px" }}>Dispatched</h2><div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{stats.dispatched}</div></div>
        <div className="admin-panel"><h2 style={{ margin: "0 0 6px" }}>Delivered</h2><div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{stats.delivered}</div></div>
      </div>

      <form className="admin-panel" onSubmit={applyFilters} style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order #, customer, phone" style={{ minHeight: "42px", padding: "8px 10px", borderRadius: "6px", border: "1px solid #EAE6DD", flex: "1 1 240px" }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ minHeight: "42px", padding: "8px 10px", borderRadius: "6px", border: "1px solid #EAE6DD" }}>
          <option value="">All Status</option>
          <option value="CREATED">Pending Approval</option>
          <option value="CONFIRMED">Approved</option>
          <option value="PROCESSING">Processing</option>
          <option value="SHIPPED">Dispatched</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button className="button button-primary" type="submit">Apply Filters</button>
      </form>

      {loading && <div className="admin-panel">Loading orders…</div>}
      {error && <div className="admin-panel" style={{ color: "#B42318" }}>{error}</div>}

      {!loading && !error && (
        <div className="admin-panel">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="admin-cell-strong">{order.orderNumber || order.order_number}</td>
                    <td>{formatDate(order.createdAt || order.created_at)}</td>
                    <td>
                      <div>{order.customerName || order.customer_name}</div>
                      <div className="admin-cell-muted">{order.customerPhone || order.customer_phone}</div>
                    </td>
                    <td>{(order.items || []).length}</td>
                    <td>{fmt(order.totalAmount || order.total_amount)}</td>
                    <td>{order.paymentStatus || order.payment_status}</td>
                    <td><StatusBadge status={order.status} /></td>
                    <td className="admin-col-actions">
                      <Link className="admin-link-btn" to={`/admin/orders/${order.id}`}>View Details</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length === 0 && <p className="admin-empty">No orders found.</p>}
        </div>
      )}
    </AdminLayout>
  );
}
