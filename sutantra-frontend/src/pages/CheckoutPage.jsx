import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import {
  createAddress,
  createOrder,
  deleteAddress,
  getActiveOffers,
  getAddresses,
  getCart,
  getCheckoutQuote,
  updateAddress
} from "../services/api";

function fmt(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

const UNSERVICEABLE_MESSAGE = "Delivery is not available for this location.";
const PIN_PATTERN = /^\d{6}$/;
const PHONE_PATTERN = /^[0-9+\-\s]{7,20}$/;
const REQUIRED_FIELDS = ["name", "phone", "address", "city", "state", "pincode"];

export default function CheckoutPage() {
  const { user, logout } = useAuth();
  const { refresh: refreshCart } = useCart();
  const navigate = useNavigate();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    is_default: false
  });
  const [addressBusy, setAddressBusy] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: ""
  });
  const [quote, setQuote] = useState(null);
  const [pinState, setPinState] = useState("idle");
  const [pinMessage, setPinMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [orderError, setOrderError] = useState("");
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerInput, setOfferInput] = useState("");
  const [appliedOfferCode, setAppliedOfferCode] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerError, setOfferError] = useState("");
  const [offerBusy, setOfferBusy] = useState(false);

  const quoteSeq = useRef(0);
  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;
    getCart()
      .then((data) => {
        if (active) setCart(data);
      })
      .catch((error) => {
        if (active) setPageError(error.message || "Unable to load your cart.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setOffersLoading(true);
    getActiveOffers()
      .then((data) => {
        if (!active) return;
        setOffers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setOffers([]);
      })
      .finally(() => {
        if (active) setOffersLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setAddressesLoading(true);
    getAddresses()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setAddresses(list);
        if (list.length > 0) {
          const def = list.find((a) => a.is_default) || list[0];
          if (def?.id) {
            setSelectedAddressId(def.id);
            setForm({
              name: def.name || "",
              phone: def.phone || "",
              address: def.address || "",
              city: def.city || "",
              state: def.state || "",
              pincode: def.pincode || ""
            });
          }
        } else {
          setForm((current) => ({
            ...current,
            name: current.name || user?.name || "",
            phone: current.phone || user?.phone || ""
          }));
        }
      })
      .catch(() => {
        if (active) {
          setAddresses([]);
          setForm((current) => ({
            ...current,
            name: current.name || user?.name || "",
            phone: current.phone || user?.phone || ""
          }));
        }
      })
      .finally(() => {
        if (active) setAddressesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (addresses.length > 0) return;
    setForm((current) => ({
      ...current,
      name: current.name || user?.name || "",
      phone: current.phone || user?.phone || ""
    }));
  }, [user, addresses.length]);

  const cartItems = cart?.items ?? [];
  const cartHasItems = cartItems.length > 0;

  useEffect(() => {
    if (order) return undefined;

    const seq = ++quoteSeq.current;

    const pincode = form.pincode.trim();
    setQuote(null);
    setPinMessage("");

    if (!cartHasItems) {
      setPinState("idle");
      return undefined;
    }
    if (!pincode) {
      setPinState("idle");
      return undefined;
    }
    if (!PIN_PATTERN.test(pincode)) {
      setPinState("invalid");
      setPinMessage("Enter a valid 6-digit PIN code.");
      return undefined;
    }

    setPinState("checking");

    const timer = setTimeout(async () => {
      try {
        const result = await getCheckoutQuote(pincode, appliedOfferCode);
        if (seq !== quoteSeq.current) return;
        if (!result?.serviceable) {
          setQuote(null);
          setPinState("unserviceable");
          setPinMessage(result?.message || UNSERVICEABLE_MESSAGE);
          return;
        }
        setQuote(result);
        setPinState("serviceable");
        setPinMessage(`Delivery is available to ${result.pincode}.`);
        if (result.offerError) {
          setOfferError(result.offerError);
          setOfferMessage("");
          if (appliedOfferCode) {
            setAppliedOfferCode("");
            setOfferInput("");
          }
        } else if (result.offer) {
          setOfferError("");
          setOfferMessage(`Offer ${result.offer.code} applied.`);
        } else if (!appliedOfferCode) {
          setOfferError("");
          setOfferMessage("");
        } else if (result && !result.offer && appliedOfferCode) {
          setOfferError("This offer is no longer eligible for your cart.");
          setOfferMessage("");
          setAppliedOfferCode("");
          setOfferInput("");
        }
      } catch (error) {
        if (seq !== quoteSeq.current) return;
        if (error.status === 401) {
          navigate("/register?redirect=/checkout", { replace: true });
          return;
        }
        setQuote(null);
        setPinState("error");
        setPinMessage(
          "We could not verify delivery for this PIN code right now. Please try again."
        );
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.pincode, order, cartHasItems, navigate, appliedOfferCode]);

  const summaryItems = (quote?.items ?? cartItems).map((item) => ({
    key: item.productId ?? item.id,
    name: item.name ?? item.productName,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice ?? item.price ?? 0),
    lineTotal: Number(item.lineTotal ?? item.subtotal ?? 0)
  }));

  const subtotal =
    quote?.subtotal ??
    summaryItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);

  const discountAmount = Number(quote?.discountAmount || 0);

  const serviceable =
    pinState === "serviceable" && quote !== null && quote.pincode === form.pincode.trim();

  const formComplete =
    REQUIRED_FIELDS.every((field) => form[field].trim()) &&
    PHONE_PATTERN.test(form.phone.trim()) &&
    PIN_PATTERN.test(form.pincode.trim());

  const hasSelectedAddress = selectedAddressId !== null && addresses.some((a) => a.id === selectedAddressId);
  const canPlace = !submitting && formComplete && serviceable && hasSelectedAddress;

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setOrderError("");
  }

  function applyAddress(addr) {
    if (!addr) return;
    setSelectedAddressId(addr.id);
    setForm({
      name: addr.name || "",
      phone: addr.phone || "",
      address: addr.address || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || ""
    });
    setOrderError("");
  }

  function openAddAddress() {
    setEditingAddressId(null);
    setAddressForm({
      name: user?.name || form.name || "",
      phone: user?.phone || form.phone || "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      is_default: addresses.length === 0
    });
    setAddressError("");
    setShowAddressForm(true);
  }

  function openEditAddress(addr) {
    setEditingAddressId(addr.id);
    setAddressForm({
      name: addr.name || "",
      phone: addr.phone || "",
      address: addr.address || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      is_default: !!addr.is_default
    });
    setAddressError("");
    setShowAddressForm(true);
  }

  function updateAddressForm(event) {
    const { name, value, type, checked } = event.target;
    setAddressForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    setAddressError("");
  }

  async function saveAddress(event) {
    event.preventDefault();
    setAddressError("");
    if (addressBusy) return;

    if (!REQUIRED_FIELDS.every((field) => (addressForm[field] || "").trim())) {
      setAddressError("Please fill in all required address fields.");
      return;
    }
    if (!PHONE_PATTERN.test((addressForm.phone || "").trim())) {
      setAddressError("Enter a valid phone number.");
      return;
    }
    if (!PIN_PATTERN.test((addressForm.pincode || "").trim())) {
      setAddressError("Enter a valid 6-digit PIN code.");
      return;
    }

    setAddressBusy(true);
    try {
      if (editingAddressId) {
        const updated = await updateAddress(editingAddressId, {
          name: addressForm.name.trim(),
          phone: addressForm.phone.trim(),
          address: addressForm.address.trim(),
          city: addressForm.city.trim(),
          state: addressForm.state.trim(),
          pincode: addressForm.pincode.trim(),
          is_default: !!addressForm.is_default
        });
        let next = addresses.map((a) => (a.id === updated.id ? updated : a));
        if (updated.is_default) {
          next = next.map((a) => (a.id === updated.id ? a : { ...a, is_default: false }));
        }
        setAddresses(next);
        if (selectedAddressId === updated.id || updated.is_default) {
          applyAddress(updated);
        }
      } else {
        if (addresses.length >= 3) {
          setAddressError("You can save a maximum of 3 addresses. Please edit or delete an existing address to add another.");
          setAddressBusy(false);
          return;
        }
        const created = await createAddress({
          name: addressForm.name.trim(),
          phone: addressForm.phone.trim(),
          address: addressForm.address.trim(),
          city: addressForm.city.trim(),
          state: addressForm.state.trim(),
          pincode: addressForm.pincode.trim(),
          is_default: !!addressForm.is_default || addresses.length === 0
        });
        let next = [...addresses, created];
        if (created.is_default) {
          next = next.map((a) => (a.id === created.id ? created : { ...a, is_default: false }));
        }
        setAddresses(next);
        applyAddress(created);
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
    } catch (error) {
      const message =
        error?.payload?.errors?.address?.[0] ||
        error?.payload?.errors?.pincode?.[0] ||
        error?.payload?.errors?.phone?.[0] ||
        error.message ||
        "Could not save address.";
      setAddressError(message);
    } finally {
      setAddressBusy(false);
    }
  }

  async function removeAddress(addr) {
    if (!addr?.id) return;
    const confirmed = window.confirm("Delete this saved address?");
    if (!confirmed) return;
    setAddressBusy(true);
    setAddressError("");
    try {
      await deleteAddress(addr.id);
      const next = addresses.filter((a) => a.id !== addr.id);
      setAddresses(next);
      if (selectedAddressId === addr.id) {
        setSelectedAddressId(null);
        setForm({
          name: user?.name || "",
          phone: user?.phone || "",
          address: "",
          city: "",
          state: "",
          pincode: ""
        });
        setQuote(null);
        setPinState("idle");
        setPinMessage("");
      }
    } catch (error) {
      setAddressError(error.message || "Could not delete address.");
    } finally {
      setAddressBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setOrderError("");
    if (!canPlace || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const created = await createOrder({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        offer_code: appliedOfferCode || undefined
      });
      setOrder(created);
      setCart(null);
      refreshCart();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      if (error.status === 401) {
        navigate("/register?redirect=/checkout", { replace: true });
        return;
      }
      const message =
        error?.payload?.errors?.offer_code?.[0] ||
        error?.payload?.errors?.pincode?.[0] ||
        error?.payload?.errors?.cart?.[0] ||
        error.message ||
        "Could not place your order. Please try again.";
      setOrderError(message);
      if (error?.payload?.errors?.offer_code?.[0]) {
        setOfferError(error?.payload?.errors?.offer_code?.[0]);
        setOfferMessage("");
      }
      if (message === UNSERVICEABLE_MESSAGE) {
        setQuote(null);
        setPinState("unserviceable");
        setPinMessage(UNSERVICEABLE_MESSAGE);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  if (order) {
    return (
      <main className="cart-page">
        <header className="cart-header">
          <Brand />
          <div className="cart-header-actions">
            <Link className="button button-light" to="/products">← Continue Shopping</Link>
          </div>
        </header>

        <div className="checkout-shell checkout-shell-single">
          <section className="checkout-panel checkout-confirmation">
            <div className="checkout-confirmation-mark" aria-hidden="true">✓</div>
            <h1>Order created</h1>
            <p className="checkout-intro">
              Your order has been created successfully. Payment processing will be
              available in a future phase.
            </p>

            <dl className="checkout-facts">
              <div><dt>Order number</dt><dd>{order.orderNumber}</dd></div>
              <div><dt>Status</dt><dd>{order.status}</dd></div>
              <div><dt>Payment</dt><dd>{order.paymentStatus} (not collected)</dd></div>
              <div><dt>Subtotal</dt><dd>{fmt(order.subtotal)}</dd></div>
              <div><dt>Discount</dt><dd>{fmt(order.discountAmount)}</dd></div>
              <div><dt>Delivery</dt><dd>{fmt(order.deliveryCharge)}</dd></div>
              <div><dt>Total</dt><dd>{fmt(order.totalAmount)}</dd></div>
            </dl>

            <div className="checkout-summary-items">
              {(order.items ?? []).map((item) => (
                <div key={item.productId} className="checkout-summary-item">
                  <span className="checkout-summary-name">
                    {item.productName}
                    <small>{item.quantity} × {fmt(item.unitPrice)}</small>
                  </span>
                  <span>{fmt(item.totalPrice)}</span>
                </div>
              ))}
            </div>

            <div className="summary-total">
              <span>Total</span>
              <span>{fmt(order.totalAmount)}</span>
            </div>

            <p className="checkout-address-snapshot">
              <strong>Delivering to</strong>
              {order.deliveryAddress}
            </p>

            <Link className="button button-primary button-wide" to="/products">
              Continue Shopping
            </Link>
          </section>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="cart-page">
        <header className="cart-header">
          <Brand />
        </header>
        <div className="checkout-shell checkout-shell-single">
          <div className="cart-loading">Loading checkout…</div>
        </div>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="cart-page">
        <header className="cart-header">
          <Brand />
          <div className="cart-header-actions">
            <Link className="button button-light" to="/cart">← Back to Cart</Link>
          </div>
        </header>
        <div className="checkout-shell checkout-shell-single">
          <div className="cart-empty">
            <h2>Checkout unavailable</h2>
            <p>{pageError}</p>
            <Link className="button button-primary" to="/cart">Back to Cart</Link>
          </div>
        </div>
      </main>
    );
  }

  if (!cartHasItems) {
    return (
      <main className="cart-page">
        <header className="cart-header">
          <Brand />
          <div className="cart-header-actions">
            <Link className="button button-light" to="/products">← Continue Shopping</Link>
          </div>
        </header>
        <div className="checkout-shell checkout-shell-single">
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Add products to your cart before checking out.</p>
            <Link className="button button-primary" to="/products">Start Shopping</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <header className="cart-header">
        <Brand />
        <div className="cart-header-actions">
          <Link className="button button-light" to="/cart">← Back to Cart</Link>
          <button className="button button-outline" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="checkout-shell">
        <form id="checkout-form" className="checkout-panel" onSubmit={handleSubmit} noValidate>
          <span className="eyebrow">Secure checkout</span>
          <h1>Delivery details</h1>
          <p className="checkout-intro">
            Select a saved address or add a new one for this order.
          </p>

          {orderError && <div className="form-alert error" role="alert">{orderError}</div>}

          <section className="saved-addresses modern-address-section">
            <div className="saved-addresses-header">
              <h2>Delivery Address</h2>
            </div>
            {addresses.length >= 3 && <p className="address-limit-note">You can save a maximum of 3 addresses. Please edit or delete an existing address to add another.</p>}
            {addressError && !showAddressForm && <div className="form-alert error" role="alert">{addressError}</div>}
            {addressesLoading ? <p className="address-empty">Loading addresses...</p> : (
              <div className="modern-address-list">
                {addresses.map((addr) => (
                  <div key={addr.id} className={`modern-address-card ${selectedAddressId === addr.id ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => applyAddress(addr)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); applyAddress(addr); } }} aria-pressed={selectedAddressId === addr.id}>
                    <div className="address-card-header">
                      <input type="radio" name="savedAddress" checked={selectedAddressId === addr.id} onChange={() => applyAddress(addr)} onClick={(e) => e.stopPropagation()} aria-label="Deliver to this address" />
                      <div className="address-card-title">
                        <div className="address-card-name-row">
                          <strong>{addr.name}</strong>
                          {addr.is_default && <span className="address-badge">Default</span>}
                        </div>
                        <span className="address-card-phone">{addr.phone}</span>
                      </div>
                    </div>
                    <p className="address-card-body">{addr.address}{addr.city ? `, ${addr.city}` : ""}{addr.state ? `, ${addr.state}` : ""}{addr.pincode ? ` - ${addr.pincode}` : ""}</p>
                    <div className="address-card-actions">
                      <button className="button-link" type="button" onClick={(e) => { e.stopPropagation(); openEditAddress(addr); }} disabled={addressBusy} title="Edit address">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path d="M11.3333 2.00004C11.5084 1.82494 11.7163 1.68605 11.9447 1.59129C12.1731 1.49653 12.4173 1.44775 12.664 1.44775C12.9107 1.44775 13.1549 1.49653 13.3833 1.59129C13.6117 1.68605 13.8196 1.82494 13.9947 2.00004C14.1698 2.17513 14.3087 2.383 14.4034 2.6114C14.4982 2.83981 14.547 3.084 14.547 3.33071C14.547 3.57742 14.4982 3.82161 14.4034 4.05002C14.3087 4.27842 14.1698 4.48629 13.9947 4.66138L5.00001 13.656L1.33334 14.6667L2.34401 11L11.3333 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Edit
                      </button>
                      <button className="button-link danger" type="button" onClick={(e) => { e.stopPropagation(); removeAddress(addr); }} disabled={addressBusy} title="Delete address">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path d="M2 4H3.33333H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5.33334 4.00004V2.66671C5.33334 2.31309 5.47382 1.97395 5.72387 1.7239C5.97392 1.47385 6.31305 1.33337 6.66668 1.33337H9.33334C9.68697 1.33337 10.0261 1.47385 10.2762 1.7239C10.5262 1.97395 10.6667 2.31309 10.6667 2.66671V4.00004M12.6667 4.00004V13.3334C12.6667 13.687 12.5262 14.0261 12.2762 14.2762C12.0261 14.5262 11.687 14.6667 11.3333 14.6667H4.66668C4.31305 14.6667 3.97392 14.5262 3.72387 14.2762C3.47382 14.0261 3.33334 13.687 3.33334 13.3334V4.00004H12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Delete
                      </button>
                    </div>
                    {selectedAddressId === addr.id && <span className="address-selected-label">Selected</span>}
                  </div>
                ))}
                <div className="add-address-card" role="button" tabIndex={0} onClick={openAddAddress} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openAddAddress(); } }} aria-label="Add new address" title="Add new address">
                  <div className="add-address-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="add-address-text">Add New Address</div>
                </div>
              </div>
            )}
            {!hasSelectedAddress && addresses.length > 0 && <p className="address-selection-note">Please select a delivery address.</p>}
          </section>

          {showAddressForm && (
            <section className="address-form-section">
              <h2>{editingAddressId ? "Edit address" : "Add new address"}</h2>
              {addressError && <div className="form-alert error" role="alert">{addressError}</div>}
              <div className="checkout-grid">
                <label className="checkout-field span-2">
                  Recipient name
                  <input
                    name="name"
                    type="text"
                    autoComplete="name"
                    maxLength="150"
                    value={addressForm.name}
                    onChange={updateAddressForm}
                  />
                </label>
                <label className="checkout-field">
                  Phone number
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength="20"
                    placeholder="10-digit mobile number"
                    value={addressForm.phone}
                    onChange={updateAddressForm}
                  />
                </label>
                <label className="checkout-field">
                  PIN code
                  <input
                    name="pincode"
                    type="text"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    maxLength="6"
                    placeholder="6-digit PIN code"
                    value={addressForm.pincode}
                    onChange={updateAddressForm}
                  />
                </label>
                <label className="checkout-field span-2">
                  Delivery address
                  <textarea
                    name="address"
                    rows="3"
                    maxLength="500"
                    autoComplete="street-address"
                    placeholder="House / flat, street, area"
                    value={addressForm.address}
                    onChange={updateAddressForm}
                  />
                </label>
                <label className="checkout-field">
                  City / Town
                  <input
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    maxLength="100"
                    value={addressForm.city}
                    onChange={updateAddressForm}
                  />
                </label>
                <label className="checkout-field">
                  State
                  <input
                    name="state"
                    type="text"
                    autoComplete="address-level1"
                    maxLength="100"
                    value={addressForm.state}
                    onChange={updateAddressForm}
                  />
                </label>
              </div>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="is_default"
                  checked={!!addressForm.is_default}
                  onChange={updateAddressForm}
                />
                Set as default
              </label>
              <div className="address-form-actions">
                <button className="button button-primary" type="button" onClick={saveAddress} disabled={addressBusy}>
                  {addressBusy ? "Saving…" : "Save Address"}
                </button>
                <button className="button button-light" type="button" onClick={() => { setShowAddressForm(false); setEditingAddressId(null); setAddressError(""); }} disabled={addressBusy}>
                  Cancel
                </button>
              </div>
            </section>
          )}
        </form>

        <aside className="order-summary" aria-label="Checkout order summary">
          <h2>Order Summary</h2>

          <div className="checkout-summary-items">
            {summaryItems.map((item) => (
              <div key={item.key} className="checkout-summary-item">
                <span className="checkout-summary-name">
                  {item.name}
                  <small>{item.quantity} × {fmt(item.unitPrice)}</small>
                </span>
                <span>{fmt(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>

          {(() => {
            const eligible = (offers || []).filter((o) => {
              if (!o) return false;
              if (o.is_active === false) return false;
              if (o.expiresAt) {
                const exp = new Date(o.expiresAt);
                const today = new Date(new Date().toDateString());
                if (exp < today) return false;
              }
              if (o.startsAt) {
                const start = new Date(o.startsAt);
                const today = new Date(new Date().toDateString());
                if (start > today) return false;
              }
              return true;
            });
            if (offersLoading) return null;
            if (eligible.length === 0) return null;
            return (
              <div className="offer-dropdown-wrap">
                <label className="offer-dropdown-label" htmlFor="offer-dropdown">Apply Offer</label>
                <select
                  id="offer-dropdown"
                  className="offer-dropdown"
                  value={appliedOfferCode}
                  disabled={!serviceable || offerBusy}
                  onChange={async (e) => {
                    const code = e.target.value;
                    setOfferBusy(true);
                    setOfferError("");
                    setOfferMessage("");
                    if (!code) {
                      setAppliedOfferCode("");
                      setOfferInput("");
                      setOfferBusy(false);
                      setOfferMessage("");
                      setOfferError("");
                      if (serviceable && form.pincode.trim()) {
                        try {
                          const result = await getCheckoutQuote(form.pincode.trim(), "");
                          if (result?.serviceable) {
                            setQuote(result);
                            setPinState("serviceable");
                            setPinMessage(`Delivery is available to ${result.pincode}.`);
                          }
                        } catch {
                          // ignore
                        }
                      }
                      return;
                    }
                    try {
                      const result = await getCheckoutQuote(form.pincode.trim(), code);
                      if (!result?.serviceable) {
                        setOfferError(result?.message || UNSERVICEABLE_MESSAGE);
                        setAppliedOfferCode("");
                        setOfferInput("");
                        setOfferBusy(false);
                        return;
                      }
                      if (result.offerError) {
                        setOfferError(result.offerError);
                        setAppliedOfferCode("");
                        setOfferInput("");
                        setOfferBusy(false);
                        return;
                      }
                      if (result.offer) {
                        const applied = result.offer.code;
                        setAppliedOfferCode(applied);
                        setOfferInput(applied);
                        setQuote(result);
                        setPinState("serviceable");
                        setPinMessage(`Delivery is available to ${result.pincode}.`);
                        setOfferError("");
                        setOfferMessage(`Offer ${applied} applied.`);
                      } else {
                        setAppliedOfferCode("");
                        setOfferInput("");
                      }
                    } catch (error) {
                      setOfferError(error?.message || "Could not apply offer code.");
                      setAppliedOfferCode("");
                      setOfferInput("");
                    } finally {
                      setOfferBusy(false);
                    }
                  }}
                >
                  <option value="">No offer</option>
                  {eligible.map((offer) => {
                    const code = (offer.code || "").toUpperCase();
                    return (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    );
                  })}
                </select>
                {offerError && <div className="offer-msg error">{offerError}</div>}
                {offerMessage && !offerError && <div className="offer-msg success">{offerMessage}</div>}
              </div>
            );
          })()}

          {serviceable ? (
            <>
              {appliedOfferCode && discountAmount > 0 && (
                <div className="summary-row discount-row">
                  <span>Offer discount ({appliedOfferCode})</span>
                  <span>- {fmt(discountAmount)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Delivery</span>
                <span>{fmt(quote.deliveryCharge)}</span>
              </div>
              <hr className="summary-divider" />
              <div className="summary-total">
                <span>Total</span>
                <span>{fmt(quote.totalAmount)}</span>
              </div>
            </>
          ) : (
            <p className="checkout-summary-note">
              Delivery charge and the final total are calculated after we confirm
              your PIN code.
            </p>
          )}

          {!hasSelectedAddress && (
            <p className="address-selection-note">Select a delivery address to place your order.</p>
          )}

          <button className="checkout-btn" type="submit" form="checkout-form" disabled={!canPlace}>
            {submitting ? "PLACING ORDER…" : "PLACE ORDER"}
          </button>

          <p className="checkout-secure-note">
            Please confirm your delivery details before placing the order.
          </p>
        </aside>
      </div>
    </main>
  );
}
