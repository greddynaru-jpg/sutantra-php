import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  createPolicy,
  deletePolicy,
  getAdminPolicies,
  updatePolicy
} from "../services/api";

const EMPTY = { slug: "", title: "", content: "", active: true, display_order: 0 };

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const list = await getAdminPolicies();
      setPolicies(Array.isArray(list) ? list : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load policies.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setError("");
    setNotice("");
    setForm({ ...EMPTY });
  }

  function openEdit(policy) {
    setError("");
    setNotice("");
    setForm({
      id: policy.id,
      slug: policy.slug,
      title: policy.title,
      content: policy.content,
      active: policy.active !== false,
      display_order: policy.displayOrder ?? 0
    });
  }

  function closeForm() {
    setForm(null);
  }

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onTitleChange(value) {
    setForm((current) => {
      const next = { ...current, title: value };
      // Keep the slug in sync while creating until the admin edits it manually.
      if (!current.id && (current.slug === "" || current.slug === slugify(current.title))) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const fields = {
        slug: slugify(form.slug),
        title: form.title.trim(),
        content: form.content,
        active: Boolean(form.active),
        display_order: Number(form.display_order) || 0
      };
      if (form.id) {
        await updatePolicy(form.id, fields);
        setNotice("Policy updated.");
      } else {
        await createPolicy(fields);
        setNotice("Policy created.");
      }
      closeForm();
      await load();
    } catch (submitError) {
      setError(submitError.message || "Unable to save the policy.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(policy) {
    if (!window.confirm(`Delete "${policy.title}"? This cannot be undone.`)) return;
    try {
      setError("");
      setNotice("");
      await deletePolicy(policy.id);
      setNotice("Policy deleted.");
      await load();
    } catch (removeError) {
      setError(removeError.message || "Unable to delete the policy.");
    }
  }

  return (
    <AdminLayout
      title="Policies"
      subtitle="Footer documents such as Privacy, Terms, Shipping & Delivery, and Refunds."
      actions={
        <button className="button button-primary" type="button" onClick={openCreate}>
          + Add policy
        </button>
      }
    >
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}

      {form && (
        <form className="admin-panel admin-form" onSubmit={submit}>
          <h2>{form.id ? "Edit policy" : "New policy"}</h2>
          <div className="admin-form-grid">
            <label className="admin-label">
              Title
              <input
                type="text"
                maxLength={200}
                required
                value={form.title}
                onChange={(event) => onTitleChange(event.target.value)}
              />
            </label>
            <label className="admin-label">
              Slug
              <input
                type="text"
                maxLength={200}
                required
                value={form.slug}
                onChange={(event) => setField("slug", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Display order
              <input
                type="number"
                min="0"
                step="1"
                value={form.display_order}
                onChange={(event) => setField("display_order", event.target.value)}
              />
            </label>
            <label className="admin-check admin-label-inline">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setField("active", event.target.checked)}
              />
              Published (visible in the footer)
            </label>
            <label className="admin-label admin-span-2">
              Content
              <textarea
                rows={10}
                required
                value={form.content}
                onChange={(event) => setField("content", event.target.value)}
              />
            </label>
          </div>

          <div className="admin-form-actions">
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : form.id ? "Save changes" : "Create policy"}
            </button>
            <button className="button button-light" type="button" onClick={closeForm} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="admin-panel">
        {loading ? (
          <p className="admin-empty">Loading policies…</p>
        ) : policies.length === 0 ? (
          <p className="admin-empty">No policies yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Slug</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id}>
                    <td className="admin-cell-strong">{policy.title}</td>
                    <td className="admin-cell-muted">{policy.slug}</td>
                    <td>{policy.displayOrder ?? 0}</td>
                    <td>
                      <span className={`admin-badge ${policy.active ? "ok" : "off"}`}>
                        {policy.active ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="admin-col-actions">
                      <button className="admin-link-btn" type="button" onClick={() => openEdit(policy)}>
                        Edit
                      </button>
                      <button className="admin-link-btn danger" type="button" onClick={() => remove(policy)}>
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
