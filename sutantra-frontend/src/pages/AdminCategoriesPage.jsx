import { useEffect, useRef, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import ImageField from "../components/ImageField";
import {
  createCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory
} from "../services/api";
import { CATEGORY_PLACEHOLDER, categoryImageUrl } from "../utils/mediaHelpers";

// Add form defaults. `type` is fixed by the button the admin clicked
// ("main" from the Main Categories section, "sub" from Subcategories).
const EMPTY_FORM = {
  name: "",
  description: "",
  active: true,
  type: "main",
  parentId: ""
};

/**
 * Category Management — deliberately simple: two flat sections on one page
 * (Main Categories and Subcategories), each with its own "+ Add" button and a
 * small inline form. It reuses the existing category APIs unchanged.
 */
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  // Focus the Category Name field once per form open. Bumping a session
  // counter (instead of watching `form`) avoids stealing focus while typing.
  const nameInputRef = useRef(null);
  const [formSession, setFormSession] = useState(0);
  const subSectionRef = useRef(null);
  const subHeadingRef = useRef(null);

  // Click-to-filter: null = no selection (show every subcategory), otherwise
  // the id of the selected main category. Filtering is purely client-side
  // over the already-loaded list — no extra API calls, no backend changes.
  const [selectedParentId, setSelectedParentId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  // Keep the selection only while the chosen main category still exists, so a
  // refresh after add/edit/delete preserves it "when possible" and never
  // leaves a filter pointing at a category that is gone.
  useEffect(() => {
    if (selectedParentId == null) return;
    const stillExists = categories.some(
      (category) => category.id === selectedParentId && !category.parentId
    );
    if (!stillExists) {
      setSelectedParentId(null);
    }
  }, [categories, selectedParentId]);

  // When a main category is selected, scroll to the Subcategories section and
  // move focus to its heading so the admin can immediately see the filtered
  // list. This is purely frontend behaviour and uses smooth scrolling when
  // supported.
  useEffect(() => {
    if (selectedParentId == null) return;
    if (!subSectionRef.current || !subHeadingRef.current) return;
    subSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      subHeadingRef.current.focus({ preventScroll: true });
    } catch (focusError) {
      // Non-fatal: focusing may fail in some environments; ignore.
    }
  }, [selectedParentId]);

  useEffect(() => {
    if (!form) return;
    const input = nameInputRef.current;
    if (!input) return;
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSession]);

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

  // Split the flat API list into the two sections.
  const mainCategories = categories.filter((category) => !category.parentId);
  const allSubcategories = categories.filter((category) => category.parentId);
  const parentName = (parentId) =>
    mainCategories.find((parent) => parent.id === parentId)?.name || "—";

  // Count direct subcategories for each main category (updates automatically
  // when data changes; no hardcoded values).
  const subcategoryCountFor = (mainId) => {
    const id = Number(mainId);
    if (Number.isNaN(id)) return 0;
    return allSubcategories.filter((category) => Number(category.parentId) === id).length;
  };

  // The selected main category (if any) and its subcategories only. With no
  // selection the list stays unfiltered, exactly as before.
  const selectedMain =
    selectedParentId == null
      ? null
      : mainCategories.find((category) => category.id === selectedParentId) || null;
  const subcategories = selectedMain
    ? allSubcategories.filter(
        (category) => Number(category.parentId) === Number(selectedMain.id)
      )
    : allSubcategories;

  // Clicking a selected main category again clears the filter (toggle), which
  // matches the "All Main Categories" button behaviour.
  function toggleMain(category) {
    const id = Number(category.id);
    setSelectedParentId((current) => (current === id ? null : id));
  }

  function clearSelection() {
    setSelectedParentId(null);
  }

  function openCreate(type) {
    setError("");
    setNotice("");
    setFieldErrors({});
    setImageFile(null);
    setRemoveImage(false);
    setForm({
      ...EMPTY_FORM,
      type,
      // Adding a subcategory while a main category is selected preselects it
      // in the parent dropdown (the admin may still change or clear it).
      parentId:
        type === "sub" && selectedParentId != null ? String(selectedParentId) : ""
    });
    setFormSession((session) => session + 1);
  }

  function openEdit(category) {
    setError("");
    setNotice("");
    setFieldErrors({});
    setImageFile(null);
    setRemoveImage(false);
    const isSub = Boolean(category.parentId);
    setForm({
      id: category.id,
      name: category.name,
      description: category.description || "",
      active: category.active !== false,
      type: isSub ? "sub" : "main",
      parentId: isSub ? String(category.parentId) : "",
      // Keep the current image so the edit form shows what is stored today.
      imageUrl: category.imageUrl
    });
    setFormSession((session) => session + 1);
  }

  function closeForm() {
    setForm(null);
    setFieldErrors({});
    setImageFile(null);
    setRemoveImage(false);
  }

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    // Clear a stale validation message as soon as the admin edits the field.
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();

    // Inline validation so each message appears beside its field.
    const clientErrors = {};
    if (!form.name.trim()) {
      clientErrors.name = ["Please enter a category name."];
    }
    if (form.type === "sub" && !form.parentId) {
      clientErrors.parent_id = ["Please select a parent category."];
    }
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    setFieldErrors({});

    try {
      // `parent_id` is sent only for subcategories; omitting it keeps a
      // category top-level (the API treats a missing parent_id as null).
      const fields = {
        name: form.name.trim(),
        description: form.description?.trim() || "",
        active: Boolean(form.active),
        remove_image: Boolean(removeImage),
        parent_id:
          form.type === "sub" && form.parentId ? String(form.parentId) : undefined
      };

      if (form.id) {
        await updateCategory(form.id, fields, imageFile);
        setNotice(`"${form.name.trim()}" updated.`);
      } else {
        await createCategory(fields, imageFile);
        setNotice(`"${form.name.trim()}" created.`);
      }
      closeForm();
      await load();
    } catch (submitError) {
      const errors = submitError?.payload?.errors;
      if (errors && typeof errors === "object" && Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setError("Please correct the highlighted fields and try again.");
      } else {
        setError(submitError.message || "Unable to save the category.");
      }
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
      setNotice(`"${category.name}" deleted.`);
      await load();
    } catch (removeError) {
      // The API explains when products or subcategories still depend on it.
      setError(removeError.message || "Unable to delete the category.");
    }
  }

  function firstError(key) {
    const value = fieldErrors[key];
    if (!value) return null;
    return Array.isArray(value) ? value[0] : String(value);
  }

  const nameError = firstError("name");
  const parentError = firstError("parent_id");
  const descriptionError = firstError("description");
  const imageError = firstError("image");

  // One small inline form, reused for both sections and for add/edit.
  function renderForm() {
    const isSub = form.type === "sub";
    const heading = form.id
      ? isSub
        ? "Edit Subcategory"
        : "Edit Main Category"
      : isSub
        ? "Add Subcategory"
        : "Add Main Category";

    return (
      <form className="admin-inline-form" onSubmit={submit} noValidate>
        <h3>{heading}</h3>

        <div className="admin-form-grid">
          <label className="admin-label" htmlFor="category-name">
            Category name
            <input
              id="category-name"
              ref={nameInputRef}
              type="text"
              value={form.name}
              maxLength={100}
              aria-invalid={nameError ? "true" : undefined}
              aria-describedby={nameError ? "category-name-error" : undefined}
              onChange={(event) => setField("name", event.target.value)}
            />
            {nameError && (
              <span id="category-name-error" className="admin-field-error" role="alert">
                {nameError}
              </span>
            )}
          </label>

          {isSub && (
            <label className="admin-label" htmlFor="category-parent">
              Parent category <span className="admin-required">*</span>
              <select
                id="category-parent"
                value={form.parentId}
                aria-invalid={parentError ? "true" : undefined}
                aria-describedby={parentError ? "category-parent-error" : undefined}
                onChange={(event) => setField("parentId", event.target.value)}
              >
                <option value="">Select a main category…</option>
                {mainCategories.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </select>
              {parentError && (
                <span id="category-parent-error" className="admin-field-error" role="alert">
                  {parentError}
                </span>
              )}
            </label>
          )}

          <label className="admin-check admin-label-inline">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setField("active", event.target.checked)}
            />
            Active (visible on the storefront)
          </label>

          <label className="admin-label admin-span-2" htmlFor="category-description">
            Description
            <textarea
              id="category-description"
              rows={2}
              maxLength={255}
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
            />
            {descriptionError && (
              <span className="admin-field-error" role="alert">
                {descriptionError}
              </span>
            )}
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
        {imageError && (
          <span className="admin-field-error" role="alert">
            {imageError}
          </span>
        )}

        <div className="admin-form-actions">
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            className="button button-light"
            type="button"
            onClick={closeForm}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  function imageCell(category) {
    return (
      <img
        className="admin-thumb"
        src={categoryImageUrl(category.imageUrl)}
        alt=""
        loading="lazy"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = CATEGORY_PLACEHOLDER;
        }}
      />
    );
  }

  function statusCell(category) {
    return (
      <span className={`admin-badge ${category.active ? "ok" : "off"}`}>
        {category.active ? "Active" : "Hidden"}
      </span>
    );
  }

  return (
    <AdminLayout
      title="Category Management"
      subtitle="Manage main categories and their subcategories in one place."
    >
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice success" role="status">
          {notice}
        </div>
      )}

      {/* ── Main Categories ─────────────────────────────────────────── */}
      <section className="admin-panel" aria-label="Main categories">
        <div className="admin-section-head">
          <div>
            <h2>Main Categories</h2>
            <p className="admin-head-note">
              Select a main category to see only its subcategories below.
            </p>
          </div>
          <button
            className="button button-primary"
            type="button"
            onClick={() => openCreate("main")}
          >
            + Add Main Category
          </button>
        </div>

        {form && form.type === "main" && renderForm()}

        {loading ? (
          <p className="admin-empty">Loading categories…</p>
        ) : mainCategories.length === 0 ? (
          <p className="admin-empty">No main categories yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mainCategories.map((category) => {
                  const isSelected = Number(category.id) === selectedParentId;
                  return (
                    <tr
                      key={category.id}
                      className={isSelected ? "is-selected" : undefined}
                    >
                      <td>{imageCell(category)}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-cat-pick"
                          aria-pressed={isSelected}
                          title={
                            isSelected
                              ? "Show all subcategories"
                              : `Show only ${category.name} subcategories`
                          }
                          onClick={() => toggleMain(category)}
                        >
                          {category.name} ({subcategoryCountFor(category.id)})
                        </button>
                      </td>
                      <td>{statusCell(category)}</td>
                      <td className="admin-col-actions">
                        <button
                          className="admin-link-btn"
                          type="button"
                          onClick={() => openEdit(category)}
                        >
                          Edit
                        </button>
                        <button
                          className="admin-link-btn danger"
                          type="button"
                          onClick={() => remove(category)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Subcategories ───────────────────────────────────────────── */}
      <section className="admin-panel" aria-label="Subcategories" ref={subSectionRef}>
        <div className="admin-section-head">
          <div>
            <h2
              ref={subHeadingRef}
              tabIndex={-1}
              className="admin-sub-heading"
              aria-live="polite"
            >
              {selectedMain
                ? `Subcategories of ${selectedMain.name}`
                : "Subcategories"}
            </h2>
            <p className="admin-head-note">
              {selectedMain
                ? `Showing only subcategories whose parent is ${selectedMain.name}.`
                : "Showing all subcategories."}
            </p>
          </div>
          <div className="admin-section-actions">
            {selectedMain && (
              <button
                className="button button-light"
                type="button"
                onClick={clearSelection}
              >
                All Main Categories
              </button>
            )}
            <button
              className="button button-primary"
              type="button"
              disabled={mainCategories.length === 0}
              title={
                mainCategories.length === 0
                  ? "Add a main category first."
                  : undefined
              }
              onClick={() => openCreate("sub")}
            >
              + Add Subcategory
            </button>
          </div>
        </div>

        {form && form.type === "sub" && renderForm()}

        {loading ? (
          <p className="admin-empty">Loading categories…</p>
        ) : subcategories.length === 0 ? (
          <p className="admin-empty">
            {selectedMain
              ? `No subcategories under ${selectedMain.name} yet.`
              : mainCategories.length === 0
                ? "Add a main category first, then subcategories will appear here."
                : "No subcategories yet."}
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Parent Category</th>
                  <th>Status</th>
                  <th className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subcategories.map((category) => (
                  <tr key={category.id}>
                    <td>{imageCell(category)}</td>
                    <td className="admin-cell-strong">{category.name}</td>
                    <td className="admin-cell-muted">{parentName(category.parentId)}</td>
                    <td>{statusCell(category)}</td>
                    <td className="admin-col-actions">
                      <button
                        className="admin-link-btn"
                        type="button"
                        onClick={() => openEdit(category)}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-link-btn danger"
                        type="button"
                        onClick={() => remove(category)}
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
      </section>
    </AdminLayout>
  );
}
