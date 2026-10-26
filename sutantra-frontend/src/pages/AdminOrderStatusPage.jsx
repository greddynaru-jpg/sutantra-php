import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { roleHome, useAuth } from "../contexts/AuthContext";
import { createAdminOrderStatus, deleteAdminOrderStatus, getAdminOrderStatuses, updateAdminOrderStatusDefinition } from "../services/api";

function StatusBadge({ active, protected: isProtected }) {
  if (isProtected) {
    return <span className="order-status-badge processing">System Protected</span>;
  }
  if (active) {
    return <span className="order-status-badge shipped">Active</span>;
  }
  return <span className="order-status-badge placed">Inactive</span>;
}

export default function AdminOrderStatusPage() {
  const { user } = useAuth();
  const dashboardPath = user ? roleHome(user.role) : "/admin";
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: "", label: "", description: "", sort_order: 0, is_active: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  function load() {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    getAdminOrderStatuses()
      .then((data) => setStatuses(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "Unable to load statuses."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ code: "", label: "", description: "", sort_order: statuses.length + 1, is_active: true });
    setFormError("");
    setSuccessMsg("");
    setShowForm(true);
  }

  function openEdit(s) {
    setEditing(s);
    setForm({ code: s.code, label: s.label, description: s.description || "", sort_order: s.sort_order || 0, is_active: !!s.is_active });
    setFormError("");
    setSuccessMsg("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setFormError("");
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    setSuccessMsg("");
    try {
      if (editing) {
        await updateAdminOrderStatusDefinition(editing.id, {
          label: form.label,
          description: form.description || null,
          sort_order: Number(form.sort_order) || 0,
          is_active: !!form.is_active
        });
        setSuccessMsg("Status updated successfully.");
      } else {
        await createAdminOrderStatus({
          code: form.code.trim().toUpperCase(),
          label: form.label.trim(),
          description: form.description.trim() || null,
          sort_order: Number(form.sort_order) || 0,
          is_active: !!form.is_active
        });
        setSuccessMsg("Status added successfully.");
      }
      closeForm();
      load();
    } catch (err) {
      setFormError(err.message || "Failed to save status.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s) {
    const confirmMsg = `Delete "${s.label}" (${s.code})?\n\nThis action cannot be undone and will only succeed if no orders use this status.`;
    if (!window.confirm(confirmMsg)) return;
    setError("");
    setSuccessMsg("");
    try {
      await deleteAdminOrderStatus(s.id);
      setSuccessMsg(`"${s.label}" deleted successfully.`);
      load();
    } catch (err) {
      setError(err.message || "Cannot delete this status.");
    }
  }

  const total = statuses.length;
  const activeCount = statuses.filter((s) => s.is_active).length;
  const inactiveCount = statuses.filter((s) => !s.is_active).length;
  const protectedCount = statuses.filter((s) => s.is_protected).length;

  return (
    <AdminLayout
      title="Order Status Management"
      subtitle="Configure the order statuses used across your order workflow."
      hideBackToDashboard
      topNav={
        <nav className="admin-page-nav" aria-label="Page navigation">
          <Link className="button button-light admin-page-nav-link" to="/">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M1.66669 7.5L8.00002 1.66667L14.3334 7.5V13.3333C14.3334 13.687 14.1929 14.0261 13.9428 14.2762C13.6928 14.5262 13.3536 14.6667 13 14.6667H3.00002C2.6464 14.6667 2.30726 14.5262 2.05721 14.2762C1.80716 14.0261 1.66669 13.687 1.66669 13.3333V7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Home Page
          </Link>
          <Link className="button button-light admin-page-nav-link" to={dashboardPath}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12.6667 8H3.33334M8.00001 3.33333L3.33334 8L8.00001 12.6667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Admin Management Page
          </Link>
        </nav>
      }
      actions={
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="button button-primary" type="button" onClick={openAdd}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M8 3.33334V12.6667M3.33334 8H12.6667" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Add New Status
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <nav style={{ fontSize: "13px", color: "var(--muted)" }}>
          <Link to="/admin" style={{ color: "var(--green)", textDecoration: "none" }}>Admin</Link>
          <span style={{ margin: "0 6px" }}>/</span>
          <Link to="/admin/orders" style={{ color: "var(--green)", textDecoration: "none" }}>Order Management</Link>
          <span style={{ margin: "0 6px" }}>/</span>
          <span style={{ color: "var(--ink)" }}>Order Status Management</span>
        </nav>

        <div className="admin-module-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div className="admin-panel" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Total Statuses</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--green)" }}>{total}</div>
          </div>
          <div className="admin-panel" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Active Statuses</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#28734A" }}>{activeCount}</div>
          </div>
          <div className="admin-panel" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Inactive Statuses</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#686868" }}>{inactiveCount}</div>
          </div>
          <div className="admin-panel" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>System Protected</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#C66A3D" }}>{protectedCount}</div>
          </div>
        </div>

        {loading && <div className="admin-panel">Loading statuses…</div>}
        {error && <div className="admin-panel" style={{ color: "#B42318", background: "#FFF0ED", borderColor: "#F1CBC4" }}>{error}</div>}
        {successMsg && <div className="admin-panel" style={{ color: "#28734A", background: "#eaf6e9", borderColor: "#D3E6CD" }}>{successMsg}</div>}

        {!loading && !error && (
          <div className="admin-panel">
            {statuses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📋</div>
                <h3 style={{ margin: "0 0 8px", fontFamily: "Playfair Display, Georgia, serif", fontWeight: 500 }}>No statuses configured</h3>
                <p style={{ color: "var(--muted)", margin: "0 0 18px" }}>Get started by adding your first order status.</p>
                <button className="button button-primary" type="button" onClick={openAdd}>Add New Status</button>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Code</th>
                      <th>Description</th>
                      <th>Display Order</th>
                      <th>Status</th>
                      <th>Type</th>
                      <th className="admin-col-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statuses.map((s) => (
                      <tr key={s.id}>
                        <td className="admin-cell-strong">{s.label}</td>
                        <td><code style={{ background: "#F7F3EB", padding: "3px 8px", borderRadius: "4px", fontSize: "12px" }}>{s.code}</code></td>
                        <td className="admin-cell-muted" style={{ maxWidth: "280px", whiteSpace: "normal" }}>{s.description || "—"}</td>
                        <td>{s.sort_order}</td>
                        <td><StatusBadge active={s.is_active} protected={s.is_protected} /></td>
                        <td>{s.is_protected ? <span style={{ fontSize: "12px", color: "var(--muted)" }}>System</span> : <span style={{ fontSize: "12px", color: "var(--muted)" }}>Custom</span>}</td>
                        <td className="admin-col-actions">
                          <button className="admin-link-btn" type="button" onClick={() => openEdit(s)} title="Edit status">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "4px", verticalAlign: "middle" }}>
                              <path d="M11.3333 2.00004C11.5084 1.82494 11.7163 1.68605 11.9447 1.59129C12.1731 1.49653 12.4173 1.44775 12.664 1.44775C12.9107 1.44775 13.1549 1.49653 13.3833 1.59129C13.6117 1.68605 13.8196 1.82494 13.9947 2.00004C14.1698 2.17513 14.3087 2.383 14.4034 2.6114C14.4982 2.83981 14.547 3.084 14.547 3.33071C14.547 3.57742 14.4982 3.82161 14.4034 4.05002C14.3087 4.27842 14.1698 4.48629 13.9947 4.66138L5.00001 13.656L1.33334 14.6667L2.34401 11L11.3333 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Edit
                          </button>
                          {!s.is_protected && (
                            <button className="admin-link-btn danger" type="button" onClick={() => remove(s)} title="Delete status">
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "4px", verticalAlign: "middle" }}>
                                <path d="M2 4H3.33333H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M5.33334 4.00004V2.66671C5.33334 2.31309 5.47382 1.97395 5.72387 1.7239C5.97392 1.47385 6.31305 1.33337 6.66668 1.33337H9.33334C9.68697 1.33337 10.0261 1.47385 10.2762 1.7239C10.5262 1.97395 10.6667 2.31309 10.6667 2.66671V4.00004M12.6667 4.00004V13.3334C12.6667 13.687 12.5262 14.0261 12.2762 14.2762C12.0261 14.5262 11.687 14.6667 11.3333 14.6667H4.66668C4.31305 14.6667 3.97392 14.5262 3.72387 14.2762C3.47382 14.0261 3.33334 13.687 3.33334 13.3334V4.00004H12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(36, 72, 48, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={closeForm}>
          <div style={{ background: "#FFFFFF", borderRadius: "14px", maxWidth: "600px", width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 70px rgba(36, 72, 48, 0.25)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #EAE6DD", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "Playfair Display, Georgia, serif", fontSize: "1.6rem", fontWeight: 500 }}>{editing ? "Edit Status" : "Add New Status"}</h2>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "13px" }}>{editing ? "Update the status details" : "Create a new order status"}</p>
              </div>
              <button type="button" onClick={closeForm} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "var(--muted)" }} aria-label="Close">×</button>
            </div>
            <form onSubmit={save} style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "18px" }}>
              {formError && <div style={{ padding: "12px 14px", background: "#FFF0ED", color: "#B42318", border: "1px solid #F1CBC4", borderRadius: "8px", fontSize: "13px" }}>{formError}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>Status Code <span style={{ color: "#B42318" }}>*</span></span>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} disabled={!!editing} required placeholder="e.g., ON_HOLD" style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "8px", border: "1px solid #EAE6DD", font: "inherit" }} />
                  {editing && <span style={{ fontSize: "11px", color: "var(--muted)" }}>Code cannot be changed</span>}
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>Display Name <span style={{ color: "#B42318" }}>*</span></span>
                  <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required placeholder="e.g., On Hold" style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "8px", border: "1px solid #EAE6DD", font: "inherit" }} />
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Description</span>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description of this status" rows={3} style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #EAE6DD", font: "inherit", resize: "vertical" }} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>Display Order</span>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} min="0" style={{ minHeight: "44px", padding: "10px 12px", borderRadius: "8px", border: "1px solid #EAE6DD", font: "inherit" }} />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "24px" }}>
                  <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} style={{ width: "18px", height: "18px", accentColor: "var(--green)" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>Active</span>
                </label>
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "8px", borderTop: "1px solid #f0ede6" }}>
                <button className="button button-light" type="button" onClick={closeForm} disabled={saving}>Cancel</button>
                <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Update Status" : "Create Status"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
