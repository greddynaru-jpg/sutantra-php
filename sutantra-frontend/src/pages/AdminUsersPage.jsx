import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../contexts/AuthContext";
import { createUser, deleteUser, getAdminUsers, updateUser } from "../services/api";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "USER",
  is_active: true
};

const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  USER: "Customer"
};

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const isSuper = currentUser?.role === "SUPER_ADMIN";
  // An ADMIN may only manage customer (USER) accounts; the API enforces this.
  const canManage = (target) => isSuper || target.role === "USER";
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load(term = search) {
    try {
      setLoading(true);
      const list = await getAdminUsers(term);
      setUsers(Array.isArray(list) ? list : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setError("");
    setNotice("");
    setForm({ ...EMPTY });
  }

  function openEdit(user) {
    setError("");
    setNotice("");
    setForm({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      role: user.role,
      is_active: user.is_active !== false
    });
  }

  function closeForm() {
    setForm(null);
  }

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const fields = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        is_active: Boolean(form.is_active)
      };
      if (form.password) {
        fields.password = form.password;
      }

      if (form.id) {
        if (!fields.password) delete fields.password;
        await updateUser(form.id, fields);
        setNotice("User updated.");
      } else {
        await createUser(fields);
        setNotice("User created.");
      }
      closeForm();
      await load();
    } catch (submitError) {
      setError(submitError.message || "Unable to save the user.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(user) {
    if (!window.confirm(`Delete ${user.name || user.email}? This cannot be undone.`)) return;
    try {
      setError("");
      setNotice("");
      await deleteUser(user.id);
      setNotice("User deleted.");
      await load();
    } catch (removeError) {
      setError(removeError.message || "Unable to delete the user.");
    }
  }

  function onSearchSubmit(event) {
    event.preventDefault();
    load(search);
  }

  return (
    <AdminLayout
      title="Users"
      subtitle={
        isSuper
          ? "Manage customers, administrators and super administrators."
          : "Manage customer accounts. Administrators and super administrators can only be changed by a super admin."
      }
      actions={
        <button className="button button-primary" type="button" onClick={openCreate}>
          {isSuper ? "+ Add user" : "+ Add customer"}
        </button>
      }
    >
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}

      {form && (
        <form className="admin-panel admin-form" onSubmit={submit}>
          <h2>{form.id ? (isSuper ? "Edit user" : "Edit customer") : isSuper ? "New user" : "New customer"}</h2>
          <div className="admin-form-grid">
            <label className="admin-label">
              Name
              <input
                type="text"
                maxLength={150}
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Email
              <input
                type="email"
                maxLength={150}
                required
                value={form.email}
                onChange={(event) => setField("email", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Phone
              <input
                type="tel"
                maxLength={15}
                required
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Role
              <select
                value={form.role}
                disabled={!isSuper}
                onChange={(event) => setField("role", event.target.value)}
              >
                <option value="USER">Customer</option>
                {isSuper && <option value="ADMIN">Admin</option>}
                {isSuper && <option value="SUPER_ADMIN">Super Admin</option>}
              </select>
            </label>
            {(isSuper || !form.id) && (
              <label className="admin-label">
                {form.id ? "New password (optional)" : "Password"}
                <input
                  type="password"
                  minLength={6}
                  maxLength={72}
                  required={!form.id}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => setField("password", event.target.value)}
                />
              </label>
            )}
            <label className="admin-check admin-label-inline">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setField("is_active", event.target.checked)}
              />
              Account active
            </label>
          </div>

          <div className="admin-form-actions">
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : form.id ? "Save changes" : isSuper ? "Create user" : "Create customer"}
            </button>
            <button className="button button-light" type="button" onClick={closeForm} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="admin-panel">
        <form className="admin-toolbar" onSubmit={onSearchSubmit}>
          <input
            type="search"
            placeholder="Search by name, email or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button className="button button-light" type="submit">Search</button>
        </form>

        {loading ? (
          <p className="admin-empty">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="admin-empty">No users found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td className="admin-cell-strong">
                      {user.name || "—"}
                      {user.id === currentUser?.id && <span className="admin-you-tag">You</span>}
                    </td>
                    <td className="admin-cell-muted">{user.email}</td>
                    <td className="admin-cell-muted">{user.phone || "—"}</td>
                    <td>
                      <span className={`admin-badge role-${user.role.toLowerCase()}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${user.is_active ? "ok" : "off"}`}>
                        {user.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="admin-col-actions">
                      <button
                        className="admin-link-btn"
                        type="button"
                        onClick={() => openEdit(user)}
                        disabled={!canManage(user)}
                        title={!canManage(user) ? "Only a super admin can edit administrator accounts" : ""}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-link-btn danger"
                        type="button"
                        onClick={() => remove(user)}
                        disabled={user.id === currentUser?.id || !canManage(user)}
                        title={
                          user.id === currentUser?.id
                            ? "You cannot delete your own account"
                            : !canManage(user)
                              ? "Only a super admin can delete administrator accounts"
                              : ""
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
