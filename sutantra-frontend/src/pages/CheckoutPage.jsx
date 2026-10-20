import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { createOrder, getCart, getCheckoutQuote } from "../services/api";

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

  // Monotonic token so a slow response for an old PIN can never mark the
  // current PIN as serviceable.
  const quoteSeq = useRef(0);
  // Blocks a second submit fired before React re-renders the disabled button.
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
    setForm((current) => ({
      ...current,
      name: current.name || user?.name || "",
      phone: current.phone || user?.phone || ""
    }));
  }, [user]);

  const cartItems = cart?.items ?? [];
  const cartHasItems = cartItems.length > 0;

  // Every PIN change invalidates the previous result immediately, then the
  // new PIN is checked against the backend after a short debounce.
  useEffect(() => {
    if (order) return undefined;

    // Any PIN edit invalidates an in-flight check, even when the new value is
    // empty or malformed (otherwise a late response for the old PIN could
    // overwrite the current state).
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
        const result = await getCheckoutQuote(pincode);
        if (seq !== quoteSeq.current) return; // stale response
        if (!result?.serviceable) {
          setQuote(null);
          setPinState("unserviceable");
          setPinMessage(result?.message || UNSERVICEABLE_MESSAGE);
          return;
        }
        setQuote(result);
        setPinState("serviceable");
        setPinMessage(`Delivery is available to ${result.pincode}.`);
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
  }, [form.pincode, order, cartHasItems, navigate]);

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

  const serviceable =
    pinState === "serviceable" && quote !== null && quote.pincode === form.pincode.trim();

  const formComplete =
    REQUIRED_FIELDS.every((field) => form[field].trim()) &&
    PHONE_PATTERN.test(form.phone.trim()) &&
    PIN_PATTERN.test(form.pincode.trim());

  const canPlace = !submitting && formComplete && serviceable;

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setOrderError("");
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
        pincode: form.pincode.trim()
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
        error?.payload?.errors?.pincode?.[0] ||
        error?.payload?.errors?.cart?.[0] ||
        error.message ||
        "Could not place your order. Please try again.";
      setOrderError(message);
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
            We’ll use these details for this order. Your account email stays on file.
          </p>

          {orderError && <div className="form-alert error" role="alert">{orderError}</div>}

          <div className="checkout-grid">
            <label className="checkout-field span-2">
              Recipient name
              <input
                name="name"
                type="text"
                autoComplete="name"
                maxLength="150"
                value={form.name}
                onChange={update}
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
                value={form.phone}
                onChange={update}
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
                value={form.pincode}
                onChange={update}
                aria-invalid={pinState === "unserviceable" || pinState === "invalid"}
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
                value={form.address}
                onChange={update}
              />
            </label>

            <label className="checkout-field">
              City / Town
              <input
                name="city"
                type="text"
                autoComplete="address-level2"
                maxLength="100"
                value={form.city}
                onChange={update}
              />
            </label>

            <label className="checkout-field">
              State
              <input
                name="state"
                type="text"
                autoComplete="address-level1"
                maxLength="100"
                value={form.state}
                onChange={update}
              />
            </label>
          </div>

          <p className={`pincode-status ${pinState}`} role="status">
            {pinMessage || "Enter your PIN code to check delivery availability."}
          </p>

          <p className="checkout-secure-note">
            No payment is collected in this phase. Your order will be created with
            payment status PENDING.
          </p>
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

          {serviceable ? (
            <>
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
