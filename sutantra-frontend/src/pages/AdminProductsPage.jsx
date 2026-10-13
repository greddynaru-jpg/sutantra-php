import { useEffect, useState } from "react";
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

  function resetFormContext() {
    setImageFile(null);
    setRemoveImage(false);
  }

  function openCreate() {
    setError("");
    setNotice("");
    resetFormContext();
    setForm({ ...EMPTY, category_id: categories[0]?.id ?? "" });
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
      title="Products"
      subtitle="Create, edit and retire catalogue items. Uploads are stored in the shared media folder."
      actions={
        <button className="button button-primary" type="button" onClick={openCreate}>
          + Add product
        </button>
      }
    >
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}

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
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Stock</th>
                  <th className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <img
                        className="admin-thumb"
                        src={productImageUrl(product.imageUrl)}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = PRODUCT_PLACEHOLDER;
                        }}
                      />
                    </td>
                    <td className="admin-cell-strong">{product.name}</td>
                    <td>{product.category?.name || "—"}</td>
                    <td>₹{Number(product.price || 0).toFixed(2)}</td>
                    <td>{product.unit || "—"}</td>
                    <td>
                      <span className={`admin-badge ${product.available ? "ok" : "off"}`}>
                        {product.available ? "Available" : "Unavailable"}
                      </span>
                    </td>
                    <td>{product.stockQuantity ?? 0}</td>
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
