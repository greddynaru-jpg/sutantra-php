import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import ImageField from "../components/ImageField";
import {
  createCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory
} from "../services/api";
import { CATEGORY_PLACEHOLDER, categoryImageUrl } from "../utils/mediaHelpers";

const EMPTY = { name: "", description: "", active: true };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const list = await getAdminCategories();
      setCategories(Array.isArray(list) ? list : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }

  function resetFormContext() {
    setImageFile(null);
    setRemoveImage(false);
  }

  function openCreate() {
    setError("");
    setNotice("");
    resetFormContext();
    setForm({ ...EMPTY });
  }

  function openEdit(category) {
    setError("");
    setNotice("");
    resetFormContext();
    setForm({
      id: category.id,
      name: category.name,
      description: category.description || "",
      active: category.active !== false,
      imageUrl: category.imageUrl
    });
  }

  function closeForm() {
    setForm(null);
    resetFormContext();
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
        description: form.description?.trim() || "",
        active: Boolean(form.active),
        remove_image: Boolean(removeImage)
      };
      if (form.id) {
        await updateCategory(form.id, fields, imageFile);
        setNotice("Category updated.");
      } else {
        await createCategory(fields, imageFile);
        setNotice("Category created.");
      }
      closeForm();
      await load();
    } catch (submitError) {
      setError(submitError.message || "Unable to save the category.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(category) {
    if (!window.confirm(`Delete "${category.name}"? This cannot be undone.`)) return;
    try {
      setError("");
      setNotice("");
      await deleteCategory(category.id);
      setNotice("Category deleted.");
      await load();
    } catch (removeError) {
      setError(removeError.message || "Unable to delete the category.");
    }
  }

  return (
    <AdminLayout
      title="Categories"
      subtitle="Organise the catalogue. A category can only be deleted once it has no products."
      actions={
        <button className="button button-primary" type="button" onClick={openCreate}>
          + Add category
        </button>
      }
    >
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}

      {form && (
        <form className="admin-panel admin-form" onSubmit={submit}>
          <h2>{form.id ? "Edit category" : "New category"}</h2>
          <div className="admin-form-grid">
            <label className="admin-label">
              Name
              <input
                type="text"
                value={form.name}
                maxLength={100}
                required
                onChange={(event) => setField("name", event.target.value)}
              />
            </label>
            <label className="admin-check admin-label-inline">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setField("active", event.target.checked)}
              />
              Active (visible on the storefront)
            </label>
            <label className="admin-label admin-span-2">
              Description
              <textarea
                rows={2}
                maxLength={255}
                value={form.description}
                onChange={(event) => setField("description", event.target.value)}
              />
            </label>
          </div>

          <ImageField
            currentUrl={categoryImageUrl(form.imageUrl)}
            placeholder={CATEGORY_PLACEHOLDER}
            file={imageFile}
            onFile={setImageFile}
            removeImage={removeImage}
            onRemoveImage={setRemoveImage}
          />

          <div className="admin-form-actions">
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : form.id ? "Save changes" : "Create category"}
            </button>
            <button className="button button-light" type="button" onClick={closeForm} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="admin-panel">
        {loading ? (
          <p className="admin-empty">Loading categories…</p>
        ) : categories.length === 0 ? (
          <p className="admin-empty">No categories yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Products</th>
                  <th>Status</th>
                  <th className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <img
                        className="admin-thumb"
                        src={categoryImageUrl(category.imageUrl)}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = CATEGORY_PLACEHOLDER;
                        }}
                      />
                    </td>
                    <td className="admin-cell-strong">{category.name}</td>
                    <td className="admin-cell-muted">{category.description || "—"}</td>
                    <td>{category.productCount ?? 0}</td>
                    <td>
                      <span className={`admin-badge ${category.active ? "ok" : "off"}`}>
                        {category.active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="admin-col-actions">
                      <button className="admin-link-btn" type="button" onClick={() => openEdit(category)}>
                        Edit
                      </button>
                      <button className="admin-link-btn danger" type="button" onClick={() => remove(category)}>
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
