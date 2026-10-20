import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  activateOffer,
  createOffer,
  deactivateOffer,
  getAdminOffers,
  updateOffer
} from "../services/api";

// Phase 1: Offer Codes administration. Offers are created, viewed, edited and
// toggled active/inactive. There is intentionally no delete action — an offer
// is deactivated instead so its history is preserved. Customer-side redemption
// and checkout integration are a later phase.
const EMPTY = {
  code: "",
  description: "",
  discount_type: "PERCENTAGE",
  discount_value: "",
  min_order_amount: "0",
  max_discount: "",
  starts_at: "",
  expires_at: "",
  usage_limit: "",
  per_customer_limit: "",
  is_active: true
};

const TYPE_LABELS = {
  PERCENTAGE: "Percentage",
  FIXED: "Fixed amount"
};

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "—";
  return `₹${Number(value).toFixed(2)}`;
}

function formatDiscount(offer) {
  const value = Number(offer.discountValue || 0);
  if (offer.discountType === "PERCENTAGE") {
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)}%`;
  }
  return `₹${value.toFixed(2)}`;
}

function formatValidity(offer) {
  return `${offer.startsAt || "Any time"} → ${offer.expiresAt || "No expiry"}`;
}

function formatUsage(offer) {
  const total = offer.usageLimit == null ? "unlimited" : offer.usageLimit;
  const perCustomer = offer.perCustomerLimit == null ? "unlimited" : offer.perCustomerLimit;
  return `${offer.usedCount ?? 0} used · ${total} total · ${perCustomer}/customer`;
}

function offerToForm(offer) {
  return {
    id: offer.id,
    code: offer.code || "",
    description: offer.description || "",
    discount_type: offer.discountType || "PERCENTAGE",
    discount_value: offer.discountValue ?? "",
    min_order_amount: offer.minOrderAmount ?? "0",
    max_discount: offer.maxDiscount ?? "",
    starts_at: offer.startsAt || "",
    expires_at: offer.expiresAt || "",
    usage_limit: offer.usageLimit ?? "",
    per_customer_limit: offer.perCustomerLimit ?? "",
    is_active: offer.isActive !== false
  };
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [form, setForm] = useState(null);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    load("", "");
  }, []);

  async function load(term = search, state = status) {
    try {
      setLoading(true);
      const list = await getAdminOffers(term, state);
      setOffers(Array.isArray(list) ? list : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load offers.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setError("");
    setNotice("");
    setDetails(null);
    setForm({ ...EMPTY });
  }

  function openEdit(offer) {
    setError("");
    setNotice("");
    setDetails(null);
    setForm(offerToForm(offer));
  }

  function viewDetails(offer) {
    setError("");
    setNotice("");
    setForm(null);
    setDetails(offer);
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
        code: form.code.trim().toUpperCase(),
        description: form.description?.trim() || "",
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        min_order_amount: form.min_order_amount === "" ? 0 : form.min_order_amount,
        max_discount:
          form.discount_type === "PERCENTAGE" && form.max_discount !== "" ? form.max_discount : null,
        starts_at: form.starts_at || null,
        expires_at: form.expires_at || null,
        usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit),
        per_customer_limit:
          form.per_customer_limit === "" ? null : Number(form.per_customer_limit),
        is_active: Boolean(form.is_active)
      };

      if (form.id) {
        await updateOffer(form.id, fields);
        setNotice("Offer updated.");
      } else {
        await createOffer(fields);
        setNotice("Offer created.");
      }
      closeForm();
      await load();
    } catch (submitError) {
      setError(submitError.message || "Unable to save the offer.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(offer) {
    const deactivating = offer.isActive;
    if (deactivating && !window.confirm(`Deactivate ${offer.code}? Customers will no longer be able to use it.`)) {
      return;
    }
    try {
      setError("");
      setNotice("");
      if (deactivating) {
        await deactivateOffer(offer.id);
        setNotice(`${offer.code} deactivated.`);
      } else {
        await activateOffer(offer.id);
        setNotice(`${offer.code} activated.`);
      }
      await load();
    } catch (toggleError) {
      setError(toggleError.message || "Unable to change the offer status.");
    }
  }

  function onSearchSubmit(event) {
    event.preventDefault();
    load(search, status);
  }

  function changeStatus(value) {
    setStatus(value);
    load(search, value);
  }

  function clearFilters() {
    setSearch("");
    setStatus("");
    load("", "");
  }

  const hasActiveFilters = Boolean(search.trim() || status);

  return (
    <AdminLayout
      title="Offer Codes"
      subtitle="Create and manage discount offer codes. Offers are deactivated rather than deleted so their history is preserved."
      actions={
        <button className="button button-primary" type="button" onClick={openCreate}>
          + Add offer
        </button>
      }
    >
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice success" role="status">{notice}</div>}

      {/* ── Search + status filters (server-side) ── */}
      <div className="admin-panel admin-filter-bar">
        <form
          className="admin-filters"
          role="search"
          aria-label="Offer filters"
          onSubmit={onSearchSubmit}
        >
          <label className="admin-label" htmlFor="offer-filter-search">
            Offer code
            <input
              id="offer-filter-search"
              type="search"
              placeholder="Search by code…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="admin-label" htmlFor="offer-filter-status">
            Status
            <select
              id="offer-filter-status"
              value={status}
              onChange={(event) => changeStatus(event.target.value)}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <div className="admin-filter-foot">
            <span className="admin-filter-count">
              Showing {offers.length} {offers.length === 1 ? "offer" : "offers"}
            </span>
            <div className="admin-filter-foot-actions">
              <button className="button button-light" type="submit">Search</button>
              <button
                className="button button-light"
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
              >
                Clear filters
              </button>
            </div>
          </div>
        </form>
      </div>

      {details && (
        <div className="admin-panel">
          <h2>Offer details — {details.code}</h2>
          <dl className="offer-details">
            <dt>Code</dt>
            <dd className="offer-code">{details.code}</dd>
            <dt>Description</dt>
            <dd>{details.description || "—"}</dd>
            <dt>Discount</dt>
            <dd>{formatDiscount(details)} ({TYPE_LABELS[details.discountType] || details.discountType})</dd>
            <dt>Minimum order amount</dt>
            <dd>{formatCurrency(details.minOrderAmount)}</dd>
            <dt>Maximum discount</dt>
            <dd>{details.maxDiscount == null ? "—" : formatCurrency(details.maxDiscount)}</dd>
            <dt>Start date</dt>
            <dd>{details.startsAt || "Any time"}</dd>
            <dt>Expiry date</dt>
            <dd>{details.expiresAt || "No expiry"}</dd>
            <dt>Total usage limit</dt>
            <dd>{details.usageLimit == null ? "Unlimited" : details.usageLimit}</dd>
            <dt>Per-customer limit</dt>
            <dd>{details.perCustomerLimit == null ? "Unlimited" : details.perCustomerLimit}</dd>
            <dt>Times used</dt>
            <dd>{details.usedCount ?? 0}</dd>
            <dt>Status</dt>
            <dd>
              <span className={`admin-badge ${details.isActive ? "ok" : "off"}`}>
                {details.isActive ? "Active" : "Inactive"}
              </span>
            </dd>
          </dl>
          <div className="admin-form-actions">
            <button className="button button-light" type="button" onClick={() => setDetails(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {form && (
        <form className="admin-panel admin-form" onSubmit={submit}>
          <h2>{form.id ? "Edit offer" : "New offer"}</h2>
          <div className="admin-form-grid">
            <label className="admin-label">
              Offer code
              <input
                type="text"
                maxLength={50}
                required
                placeholder="WELCOME10"
                value={form.code}
                onChange={(event) => setField("code", event.target.value.toUpperCase())}
              />
            </label>
            <label className="admin-label">
              Discount type
              <select
                value={form.discount_type}
                onChange={(event) => setField("discount_type", event.target.value)}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed amount (₹)</option>
              </select>
            </label>
            <label className="admin-label">
              {form.discount_type === "PERCENTAGE" ? "Discount value (%)" : "Discount value (₹)"}
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.discount_value}
                onChange={(event) => setField("discount_value", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Minimum order amount (₹)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.min_order_amount}
                onChange={(event) => setField("min_order_amount", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Maximum discount (₹)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.max_discount}
                disabled={form.discount_type !== "PERCENTAGE"}
                placeholder={form.discount_type === "PERCENTAGE" ? "Optional cap" : "Percentage offers only"}
                onChange={(event) => setField("max_discount", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Start date
              <input
                type="date"
                value={form.starts_at}
                onChange={(event) => setField("starts_at", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Expiry date
              <input
                type="date"
                value={form.expires_at}
                onChange={(event) => setField("expires_at", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Total usage limit
              <input
                type="number"
                min="1"
                step="1"
                value={form.usage_limit}
                placeholder="Unlimited"
                onChange={(event) => setField("usage_limit", event.target.value)}
              />
            </label>
            <label className="admin-label">
              Per-customer limit
              <input
                type="number"
                min="1"
                step="1"
                value={form.per_customer_limit}
                placeholder="Unlimited"
                onChange={(event) => setField("per_customer_limit", event.target.value)}
              />
            </label>
            <label className="admin-label admin-span-2">
              Description
              <textarea
                rows={2}
                maxLength={500}
                value={form.description}
                onChange={(event) => setField("description", event.target.value)}
              />
            </label>
            <label className="admin-check admin-label-inline">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setField("is_active", event.target.checked)}
              />
              Active
            </label>
          </div>

          <div className="admin-form-actions">
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : form.id ? "Save changes" : "Create offer"}
            </button>
            <button className="button button-light" type="button" onClick={closeForm} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="admin-panel">
        {loading ? (
          <p className="admin-empty">Loading offers…</p>
        ) : offers.length === 0 ? (
          <p className="admin-empty">
            {hasActiveFilters
              ? "No offers match your search or filters."
              : "No offers yet. Use “Add offer” to create one."}
          </p>
        ) : (
          <div className="admin-table-wrap" role="region" aria-label="Offer list" tabIndex={0}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Offer code</th>
                  <th scope="col">Description</th>
                  <th scope="col">Discount</th>
                  <th scope="col">Minimum order</th>
                  <th scope="col">Maximum discount</th>
                  <th scope="col">Validity</th>
                  <th scope="col">Usage limits</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id}>
                    <td className="admin-cell-strong">
                      <span className="offer-code">{offer.code}</span>
                    </td>
                    <td className="admin-cell-muted">{offer.description || "—"}</td>
                    <td>
                      {formatDiscount(offer)}{" "}
                      <span className="admin-cell-muted">
                        ({TYPE_LABELS[offer.discountType] || offer.discountType})
                      </span>
                    </td>
                    <td>{formatCurrency(offer.minOrderAmount)}</td>
                    <td>{offer.maxDiscount == null ? "—" : formatCurrency(offer.maxDiscount)}</td>
                    <td className="admin-cell-muted">{formatValidity(offer)}</td>
                    <td className="admin-cell-muted">{formatUsage(offer)}</td>
                    <td>
                      <span className={`admin-badge ${offer.isActive ? "ok" : "off"}`}>
                        {offer.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="admin-col-actions">
                      <button className="admin-link-btn" type="button" onClick={() => viewDetails(offer)}>
                        View
                      </button>
                      <button className="admin-link-btn" type="button" onClick={() => openEdit(offer)}>
                        Edit
                      </button>
                      <button
                        className={`admin-link-btn ${offer.isActive ? "danger" : ""}`}
                        type="button"
                        onClick={() => toggleActive(offer)}
                      >
                        {offer.isActive ? "Deactivate" : "Activate"}
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
