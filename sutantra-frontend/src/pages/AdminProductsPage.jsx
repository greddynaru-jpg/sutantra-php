import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import ImageField from "../components/ImageField";
import {
  createProduct,
  deleteProduct,
  getAdminCategories,
  getAdminProducts,
  updateProduct
} from "../services/api";
import { PRODUCT_PLACEHOLDER, productImageUrl } from "../utils/mediaHelpers";

const EMPTY = {
  name: "",
  description: "",
  category_id: "",
  price: "",
  unit: "",
  available: true,
  stock_quantity: 0
};

/**
 * Resolve the two-level category a product belongs to, using only the
 * category data already returned by the existing APIs:
 *   - product assigned to a main category   → main only, no subcategory
 *   - product assigned to a subcategory     → its parent is the main category
 * Nothing is ever guessed: unknown ids simply resolve to "—".
 */
function resolveProductCategory(product, categoryById) {
  const categoryId = product.categoryId ?? product.category?.id ?? null;
  const record = categoryId != null ? categoryById.get(String(categoryId)) : undefined;
  const category = record || product.category || null;

  if (!category) {
    return { mainId: null, mainName: null, subId: null, subName: null };
  }

  const parentId = category.parentId ?? null;
  if (parentId != null) {
    const parent = categoryById.get(String(parentId));
    return {
      mainId: String(parentId),
      mainName: parent?.name ?? null,
      subId: String(category.id),
      subName: category.name ?? null
    };
  }

  return {
    mainId: String(category.id),
    mainName: category.name ?? null,
    subId: null,
    subName: null
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  // List filters. Everything below is applied client-side to the already
  // loaded list, so no API endpoint, parameter or response changes.
  const [filterMainId, setFilterMainId] = useState("");
  const [filterSubId, setFilterSubId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [availability, setAvailability] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const [productList, categoryList] = await Promise.all([
        getAdminProducts(),
        getAdminCategories()
      ]);
      setProducts(Array.isArray(productList) ? productList : []);
      setCategories(Array.isArray(categoryList) ? categoryList : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }

  const categoryById = useMemo(() => {
    const map = new Map();
    categories.forEach((category) => map.set(String(category.id), category));
    return map;
  }, [categories]);

  const mainCategories = useMemo(
    () => categories.filter((category) => !category.parentId),
    [categories]
  );

  // The subcategory dropdown only ever lists subcategories of the selected
  // main category (empty while "All main categories" is chosen).
  const subOptions = useMemo(
    () =>
      filterMainId
        ? categories.filter(
            (category) => category.parentId && String(category.parentId) === filterMainId
          )
        : [],
    [categories, filterMainId]
  );

  const hasActiveFilters = Boolean(
    filterMainId || filterSubId || searchTerm.trim() || availability
  );

  // Main category → direct products + products of its subcategories.
  // Subcategory → only products assigned to that subcategory.
  // Name search and availability combine with whichever category is chosen.
  const visibleRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const rows = [];

    for (const product of products) {
      const info = resolveProductCategory(product, categoryById);

      if (filterMainId && info.mainId !== filterMainId) continue;
      if (filterSubId && info.subId !== filterSubId) continue;
      if (availability === "available" && product.available === false) continue;
      if (availability === "unavailable" && product.available !== false) continue;
      if (term && !String(product.name || "").toLowerCase().includes(term)) continue;

      rows.push({ product, info });
    }

    return rows;
  }, [products, categoryById, filterMainId, filterSubId, availability, searchTerm]);

  function changeMainCategory(value) {
    setFilterMainId(value);
    // Keep the chosen subcategory only while it still belongs to the newly
    // selected main category; otherwise reset it.
    if (filterSubId) {
      const sub = categoryById.get(filterSubId);
      const stillValid = Boolean(value) && Boolean(sub) && String(sub.parentId) === value;
      if (!stillValid) setFilterSubId("");
    }
  }

  function clearFilters() {
    setFilterMainId("");
    setFilterSubId("");
    setSearchTerm("");
    setAvailability("");
  }

  function resetFormContext() {
    setImageFile(null);
    setRemoveImage(false);
  }

  function openCreate() {
    setError("");
    setNotice("");
    resetFormContext();
    // Preselect the category currently being filtered (when it still exists)
    // so a product created from a filtered view lands where the admin expects.
    const filteredCategory = filterSubId || filterMainId;
    const preset =
      filteredCategory && categoryById.has(filteredCategory)
        ? filteredCategory
        : categories[0]?.id ?? "";
    setForm({ ...EMPTY, category_id: preset });
  }

  function openEdit(product) {
    setError("");
    setNotice("");
    resetFormContext();
    setForm({
      id: product.id,
      name: product.name,
      description: product.description || "",
      category_id: product.categoryId ?? product.category?.id ?? "",
      price: product.price,
      unit: product.unit || "",
      available: product.available !== false,
      stock_quantity: product.stockQuantity ?? 0,
      imageUrl: product.imageUrl
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
        category_id: form.category_id,
        price: form.price,
        unit: form.unit?.trim() || "",
        available: Boolean(form.available),
        stock_quantity: Number(form.stock_quantity) || 0,
        remove_image: Boolean(removeImage)
      };
      if (form.id) {
        await updateProduct(form.id, fields, imageFile);
        setNotice("Product updated.");
      } else {
        await createProduct(fields, imageFile);
        setNotice("Product created.");
      }
      closeForm();
      await load();
    } catch (submitError) {
      setError(submitError.message || "Unable to save the product.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      setError("");
      setNotice("");
      await deleteProduct(product.id);
      setNotice("Product deleted.");
      await load();
    } catch (removeError) {
      setError(removeError.message || "Unable to delete the product.");
    }
  }

  return (
    <AdminLayout
      title="Product Management"
      subtitle="Create, edit and retire catalogue items. Uploads are stored in the shared media folder."
      actions={
        <button className="button button-primary" type="button" onClick={openCreate}>
          + Add product
        </button>
      }
    >
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}

      {/* ── Compact filter toolbar (client-side, existing data only) ── */}
      <div className="admin-panel admin-filter-bar">
        <form
          className="admin-filters"
          role="search"
          aria-label="Product filters"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="admin-label" htmlFor="product-filter-main">
            Main category
            <select
              id="product-filter-main"
              value={filterMainId}
              onChange={(event) => changeMainCategory(event.target.value)}
            >
              <option value="">All main categories</option>
              {mainCategories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-label" htmlFor="product-filter-sub">
            Subcategory
            <select
              id="product-filter-sub"
              value={filterSubId}
              disabled={!filterMainId || subOptions.length === 0}
              onChange={(event) => setFilterSubId(event.target.value)}
            >
              <option value="">
                {!filterMainId
                  ? "Select a main category"
                  : subOptions.length === 0
                    ? "No subcategories"
                    : "All subcategories"}
              </option>
              {subOptions.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-label" htmlFor="product-filter-search">
            Product name
            <input
              id="product-filter-search"
              type="search"
              placeholder="Search by name…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <label className="admin-label" htmlFor="product-filter-availability">
            Availability
            <select
              id="product-filter-availability"
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
            >
              <option value="">All</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </label>

          <div className="admin-filter-foot">
            <span className="admin-filter-count">
              Showing {visibleRows.length} of {products.length}{" "}
              {products.length === 1 ? "product" : "products"}
            </span>
            <button
              className="button button-light"
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              Clear filters
            </button>
          </div>
        </form>
      </div>

      {form && (
        <form className="admin-panel admin-form" onSubmit={submit}>
          <h2>{form.id ? "Edit product" : "New product"}</h2>
          <div className="admin-form-grid">
            <label className="admin-label">
              Name
              <input
                type="text"
                value={form.name}
                maxLength={150}
                required
                onChange={(event) => setField("name", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Category
              <select
                value={form.category_id}
                required
                onChange={(event) => setField("category_id", event.target.value)}
              >
                <option value="" disabled>Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="admin-label">
              Price (₹)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                required
                onChange={(event) => setField("price", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Unit
              <input
                type="text"
                value={form.unit}
                maxLength={50}
                placeholder="kg, 500g, packet…"
                onChange={(event) => setField("unit", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Stock quantity
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock_quantity}
                onChange={(event) => setField("stock_quantity", event.target.value)}
              />
            </label>
            <label className="admin-check admin-label-inline">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(event) => setField("available", event.target.checked)}
              />
              Available for purchase
            </label>
            <label className="admin-label admin-span-2">
              Description
              <textarea
                rows={3}
                maxLength={500}
                value={form.description}
                onChange={(event) => setField("description", event.target.value)}
              />
            </label>
          </div>

          <ImageField
            currentUrl={form.imageUrl ? productImageUrl(form.imageUrl) : PRODUCT_PLACEHOLDER}
            placeholder={PRODUCT_PLACEHOLDER}
            file={imageFile}
            onFile={setImageFile}
            removeImage={removeImage}
            onRemoveImage={setRemoveImage}
          />

          <div className="admin-form-actions">
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : form.id ? "Save changes" : "Create product"}
            </button>
            <button className="button button-light" type="button" onClick={closeForm} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="admin-panel">
        {loading ? (
          <p className="admin-empty">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="admin-empty">No products yet. Use “Add product” to create one.</p>
        ) : visibleRows.length === 0 ? (
          <div className="admin-empty">
            <p>No products match your current filters.</p>
            <button className="button button-light" type="button" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div
            className="admin-table-wrap"
            role="region"
            aria-label="Product list"
            tabIndex={0}
          >
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Image</th>
                  <th scope="col">Name</th>
                  <th scope="col">Main Category</th>
                  <th scope="col">Subcategory</th>
                  <th scope="col">Price</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Stock Quantity</th>
                  <th scope="col">Availability</th>
                  <th scope="col" className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(({ product, info }) => (
                  <tr key={product.id}>
                    <td>
                      <img
                        className="admin-thumb"
                        src={productImageUrl(product.imageUrl)}
                        alt=""
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = PRODUCT_PLACEHOLDER;
                        }}
                      />
                    </td>
                    <td className="admin-cell-strong">{product.name}</td>
                    <td>{info.mainName || "—"}</td>
                    <td>{info.subName || "—"}</td>
                    <td>₹{Number(product.price || 0).toFixed(2)}</td>
                    <td>{product.unit || "—"}</td>
                    <td>{product.stockQuantity ?? 0}</td>
                    <td>
                      <span className={`admin-badge ${product.available === false ? "off" : "ok"}`}>
                        {product.available === false ? "Unavailable" : "Available"}
                      </span>
                    </td>
                    <td className="admin-col-actions">
                      <button className="admin-link-btn" type="button" onClick={() => openEdit(product)}>
                        Edit
                      </button>
                      <button className="admin-link-btn danger" type="button" onClick={() => remove(product)}>
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
