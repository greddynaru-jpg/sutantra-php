import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import ImageField from "../components/ImageField";
import {
  createBanner,
  deleteBanner,
  getAdminBanners,
  updateBanner
} from "../services/api";
import { BANNER_PLACEHOLDER, bannerImageUrl } from "../utils/mediaHelpers";

const EMPTY = { title: "", subtitle: "", target_url: "", active: true, display_order: 0 };

export default function AdminBannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const list = await getAdminBanners();
      setBanners(Array.isArray(list) ? list : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load banners.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setError("");
    setNotice("");
    setImageFile(null);
    setForm({ ...EMPTY });
  }

  function openEdit(banner) {
    setError("");
    setNotice("");
    setImageFile(null);
    setForm({
      id: banner.id,
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      target_url: banner.targetUrl || "",
      active: banner.active !== false,
      display_order: banner.displayOrder ?? 0,
      imageUrl: banner.imageUrl
    });
  }

  function closeForm() {
    setForm(null);
    setImageFile(null);
  }

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.id && !imageFile) {
      setError("Please choose a banner image before saving.");
      return;
    }

    setBusy(true);
    try {
      const fields = {
        title: form.title?.trim() || "",
        subtitle: form.subtitle?.trim() || "",
        target_url: form.target_url?.trim() || "",
        active: Boolean(form.active),
        display_order: Number(form.display_order) || 0
      };
      if (form.id) {
        await updateBanner(form.id, fields, imageFile);
        setNotice("Banner updated.");
      } else {
        await createBanner(fields, imageFile);
        setNotice("Banner created.");
      }
      closeForm();
      await load();
    } catch (submitError) {
      setError(submitError.message || "Unable to save the banner.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(banner) {
    if (!window.confirm("Delete this banner? This cannot be undone.")) return;
    try {
      setError("");
      setNotice("");
      await deleteBanner(banner.id);
      setNotice("Banner deleted.");
      await load();
    } catch (removeError) {
      setError(removeError.message || "Unable to delete the banner.");
    }
  }

  return (
    <AdminLayout
      title="Homepage Banners"
      subtitle="Only active banners appear on the homepage; they rotate automatically in display order."
      actions={
        <button className="button button-primary" type="button" onClick={openCreate}>
          + Add banner
        </button>
      }
    >
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}

      {form && (
        <form className="admin-panel admin-form" onSubmit={submit}>
          <h2>{form.id ? "Edit banner" : "New banner"}</h2>
          <div className="admin-form-grid">
            <label className="admin-label">
              Title
              <input
                type="text"
                maxLength={150}
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Subtitle
              <input
                type="text"
                maxLength={255}
                value={form.subtitle}
                onChange={(event) => setField("subtitle", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Link (optional)
              <input
                type="text"
                maxLength={500}
                placeholder="https://… or /products"
                value={form.target_url}
                onChange={(event) => setField("target_url", event.target.value)}
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
              Active
            </label>
          </div>

          <ImageField
            currentUrl={form.imageUrl ? bannerImageUrl(form.imageUrl) : BANNER_PLACEHOLDER}
            placeholder={BANNER_PLACEHOLDER}
            file={imageFile}
            onFile={setImageFile}
          />
          {form.id && (
            <p className="admin-image-hint">Leave the image untouched to keep the current banner artwork.</p>
          )}

          <div className="admin-form-actions">
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : form.id ? "Save changes" : "Create banner"}
            </button>
            <button className="button button-light" type="button" onClick={closeForm} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="admin-panel">
        {loading ? (
          <p className="admin-empty">Loading banners…</p>
        ) : banners.length === 0 ? (
          <p className="admin-empty">No banners yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Title</th>
                  <th>Subtitle</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner) => (
                  <tr key={banner.id}>
                    <td>
                      <img
                        className="admin-thumb wide"
                        src={bannerImageUrl(banner.imageUrl)}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = BANNER_PLACEHOLDER;
                        }}
                      />
                    </td>
                    <td className="admin-cell-strong">{banner.title || "—"}</td>
                    <td className="admin-cell-muted">{banner.subtitle || "—"}</td>
                    <td>{banner.displayOrder ?? 0}</td>
                    <td>
                      <span className={`admin-badge ${banner.active ? "ok" : "off"}`}>
                        {banner.active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="admin-col-actions">
                      <button className="admin-link-btn" type="button" onClick={() => openEdit(banner)}>
                        Edit
                      </button>
                      <button className="admin-link-btn danger" type="button" onClick={() => remove(banner)}>
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
