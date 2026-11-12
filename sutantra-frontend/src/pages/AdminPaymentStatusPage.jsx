import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { roleHome, useAuth } from "../contexts/AuthContext";
import {
  createAdminPaymentStatus,
  getAdminPaymentStatuses,
  setAdminPaymentStatusActive,
  updateAdminPaymentStatus
} from "../services/api";

function StatusPill({ active }) {
  return active ? (
    <span className="order-status-badge shipped">Active</span>
  ) : (
    <span className="order-status-badge placed">Inactive</span>
  );
}

export default function AdminPaymentStatusPage() {
  const { user } = useAuth();
  const dashboardPath = user ? roleHome(user.role) : "/admin";

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ status_code: "", display_name: "", description: "", sort_order: 0, is_active: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    getAdminPaymentStatuses({
      search: appliedSearch || undefined,
      active: activeFilter,
      page,
      perPage: 15
    })
      .then((res) => {
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setRows(data);
        setMeta(res?.meta || res?.current_page ? { current_page: res.current_page, last_page: res.last_page, total: res.total, from: res.from, to: res.to } : (res?.meta || null));
      })
      .catch((err) => {
        setError(err.message || "Unable to load payment statuses.");
        setRows([]);
        setMeta(null);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSearch, activeFilter, page]);

  function openAdd() {
    setEditing(null);
    setForm({ status_code: "", display_name: "", description: "", sort_order: rows.length + 1, is_active: true });
    setFormError("");
    setSuccessMsg("");
    setShowForm(true);
  }

  function openEdit(s) {
    setEditing(s);
    setForm({
      status_code: s.status_code || "",
      display_name: s.display_name || "",
      description: s.description || "",
      sort_order: s.sort_order ?? 0,
      is_active: !!s.is_active
    });
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
        await updateAdminPaymentStatus(editing.id, {
          display_name: form.display_name.trim(),
          description: form.description.trim() || null,
          sort_order: Number(form.sort_order) || 0,
          is_active: !!form.is_active
        });
        setSuccessMsg("Payment status updated successfully.");
      } else {
        await createAdminPaymentStatus({
          status_code: form.status_code.trim().toUpperCase(),
          display_name: form.display_name.trim(),
          description: form.description.trim() || null,
          sort_order: Number(form.sort_order) || 0,
          is_active: !!form.is_active
        });
        setSuccessMsg("Payment status added successfully.");
      }
      closeForm();
      load();
    } catch (err) {
      setFormError(err?.payload?.errors ? Object.values(err.payload.errors).flat()[0] : (err.message || "Failed to save payment status."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s) {
    setError("");
    setSuccessMsg("");
    try {
      await setAdminPaymentStatusActive(s.id, !s.is_active);
      setSuccessMsg(`"${s.display_name}" ${s.is_active ? "deactivated" : "activated"} successfully.`);
      load();
    } catch (err) {
      setError(err?.payload?.errors ? Object.values(err.payload.errors).flat()[0] : (err.message || "Unable to update status."));
    }
  }

  function applySearch(e) {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  }

  const total = meta?.total ?? rows.length;
  const currentPage = meta?.current_page ?? page;
  const lastPage = meta?.last_page ?? 1;

  const summary = useMemo(() => {
    const active = rows.filter((r) => r.is_active).length;
    return { shown: rows.length, active, inactive: rows.length - active };
  }, [rows]);

  return (
    <AdminLayout
      title="Payment Status Management"
      subtitle="Configure payment statuses used across the application. Data is retrieved dynamically from the database."
      hideBackToDashboard
      topNav={
        <nav className="admin-page-nav" aria-label="Page navigation">
          <Link className="button button-light admin-page-nav-link" to="/">Back to Home Page</Link>
          <Link className="button button-light admin-page-nav-link" to={dashboardPath}>Back to Admin Management Page</Link>
        </nav>
      }
      actions={
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link className="button button-light" to="/admin/order-statuses">Order Statuses</Link>
          <button className="button button-primary" type="button" onClick={openAdd}>Add Payment Status</button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="admin-module-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div className="admin-panel" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Shown</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--green)" }}>{summary.shown}</div>
          </div>
          <div className="admin-panel" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Active (page)</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#28734A" }}>{summary.active}</div>
          </div>
          <div className="admin-panel" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Inactive (page)</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#686868" }}>{summary.inactive}</div>
          </div>
        </div>

        <form className="admin-panel" onSubmit={applySearch} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 260px" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Search</span>
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Status code or display name" style={{ minHeight: 42, padding: "10px 12px", borderRadius: 8, border: "1px solid #EAE6DD" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, width: 180 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Active</span>
            <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }} style={{ minHeight: 42, padding: "10px 12px", borderRadius: 8, border: "1px solid #EAE6DD" }}>
              <option value="">All</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </label>
          <button className="button button-primary" type="submit">Search</button>
          <button className="button button-light" type="button" onClick={() => { setSearchInput(""); setAppliedSearch(""); setActiveFilter(""); setPage(1); }}>Reset</button>
        </form>

        {loading && <div className="admin-panel">Loading payment statuses…</div>}
        {error && <div className="admin-panel" style={{ color: "#B42318", background: "#FFF0ED", borderColor: "#F1CBC4" }}>{error}</div>}
        {successMsg && <div className="admin-panel" style={{ color: "#28734A", background: "#eaf6e9", borderColor: "#D3E6CD" }}>{successMsg}</div>}

        {!loading && !error && (
          <div className="admin-panel">
            {rows.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px" }}>
                <p style={{ color: "var(--muted)", marginBottom: 14 }}>No payment statuses found.</p>
                <button className="button button-primary" type="button" onClick={openAdd}>Add Payment Status</button>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status Code</th>
                      <th>Display Name</th>
                      <th>Description</th>
                      <th>Sort Order</th>
                      <th>Status</th>
                      <th className="admin-col-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => (
                      <tr key={s.id}>
                        <td>{s.id}</td>
                        <td><code style={{ background: "#F7F3EB", padding: "3px 8px", borderRadius: 4, fontSize: 12 }}>{s.status_code}</code></td>
                        <td className="admin-cell-strong">{s.display_name}</td>
                        <td className="admin-cell-muted" style={{ maxWidth: 300, whiteSpace: "normal" }}>{s.description || "—"}</td>
                        <td>{s.sort_order}</td>
                        <td><StatusPill active={s.is_active} /></td>
                        <td className="admin-col-actions">
                          <button className="admin-link-btn" type="button" onClick={() => openEdit(s)}>Edit</button>
                          <button className="admin-link-btn" type="button" onClick={() => toggleActive(s)}>{s.is_active ? "Deactivate" : "Activate"}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {rows.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, flexWrap: "wrap", gap: 10 }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>Showing {meta?.from ?? 1}–{meta?.to ?? rows.length} of {total}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="button button-light" type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
                  <span style={{ fontSize: 13 }}>Page {currentPage} of {lastPage}</span>
                  <button className="button button-light" type="button" disabled={currentPage >= lastPage} onClick={() => setPage((p) => Math.min(lastPage, p + 1))}>Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(36, 72, 48, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={closeForm}>
          <div style={{ background: "#FFF", borderRadius: 14, maxWidth: 640, width: "100%", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "22px 26px", borderBottom: "1px solid #EAE6DD", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "Playfair Display, Georgia, serif", fontSize: "1.5rem", fontWeight: 500 }}>{editing ? "Edit Payment Status" : "Add Payment Status"}</h2>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>{editing ? "Update status details (code is read-only)" : "Create a new payment status"}</p>
              </div>
              <button type="button" onClick={closeForm} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "var(--muted)" }}>×</button>
            </div>
            <form onSubmit={save} style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
              {formError && <div style={{ padding: "10px 12px", background: "#FFF0ED", color: "#B42318", border: "1px solid #F1CBC4", borderRadius: 8, fontSize: 13 }}>{formError}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Status Code <span style={{ color: "#B42318" }}>*</span></span>
                  <input value={form.status_code} onChange={(e) => setForm({ ...form, status_code: e.target.value.toUpperCase() })} disabled={!!editing} required placeholder="e.g. PENDING" style={{ minHeight: 42, padding: "10px 12px", borderRadius: 8, border: "1px solid #EAE6DD" }} />
                  {editing && <span style={{ fontSize: 11, color: "var(--muted)" }}>Status code is read-only after creation</span>}
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Display Name <span style={{ color: "#B42318" }}>*</span></span>
                  <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required placeholder="e.g. Pending Payment" style={{ minHeight: 42, padding: "10px 12px", borderRadius: 8, border: "1px solid #EAE6DD" }} />
                </label>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Description</span>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Status explanation" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #EAE6DD", resize: "vertical" }} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Sort Order</span>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} style={{ minHeight: 42, padding: "10px 12px", borderRadius: 8, border: "1px solid #EAE6DD" }} />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 24 }}>
                  <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--green)" }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Active</span>
                </label>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #f0ede6", paddingTop: 12 }}>
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
