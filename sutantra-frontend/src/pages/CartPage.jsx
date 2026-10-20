import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import {
  clearCart,
  decreaseCartItemQuantity,
  getCart,
  increaseCartItemQuantity,
  removeCartItem
} from "../services/api";
import { productImageUrl } from "../utils/mediaHelpers";

function fmt(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

const DELIVERY_THRESHOLD = 500;
const DELIVERY_CHARGE = 40;

export default function CartPage() {
  const { logout } = useAuth();
  const { refresh: refreshCart } = useCart();
  const navigate = useNavigate();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [busyItemId, setBusyItemId] = useState(null);
  const [clearBusy, setClearBusy] = useState(false);

  const loadCart = useCallback(async () => {
    try {
      const data = await getCart();
      setCart(data);
      setUnavailable(false);
    } catch (e) {
      if (e.status === 404 || e.status === 405) {
        // Cart endpoints land with the orders phase; keep the page usable.
        setUnavailable(true);
      } else {
        setError(e.message || "Unable to load cart.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  async function handleIncrease(itemId) {
    setBusyItemId(itemId);
    try {
      const updated = await increaseCartItemQuantity(itemId);
      setCart(updated);
      refreshCart();
    } catch (e) {
      setError(e.message || "Could not update quantity.");
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleDecrease(itemId) {
    setBusyItemId(itemId);
    try {
      const updated = await decreaseCartItemQuantity(itemId);
      setCart(updated);
      refreshCart();
    } catch (e) {
      setError(e.message || "Could not update quantity.");
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleRemove(itemId) {
    setBusyItemId(itemId);
    try {
      await removeCartItem(itemId);
      await loadCart();
      refreshCart();
    } catch (e) {
      setError(e.message || "Could not remove item.");
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleClear() {
    if (!window.confirm("Clear all items from your cart?")) return;
    setClearBusy(true);
    try {
      await clearCart();
      await loadCart();
      refreshCart();
    } catch (e) {
      setError(e.message || "Could not clear cart.");
    } finally {
      setClearBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  const items = cart?.items ?? [];
  const subtotal =
    cart?.totalAmount != null
      ? Number(cart.totalAmount)
      : items.reduce(
          (sum, item) => sum + Number(item.price ?? item.product?.price ?? 0) * item.quantity,
          0
        );
  // Delivery is intentionally not charged on the cart page: it will be
  // calculated at checkout. The existing rule and constants are kept for that
  // future implementation but are no longer added to the cart total.
  const delivery = subtotal > 0 && subtotal < DELIVERY_THRESHOLD ? DELIVERY_CHARGE : 0;
  const grandTotal = subtotal;

  return (
    <main className="cart-page">
      <header className="cart-header">
        <Brand />
        <div className="cart-header-actions">
          <Link className="button button-light" to="/products">← Continue Shopping</Link>
          <button className="button button-outline" type="button" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="cart-shell">
        {error && <div className="cart-error" role="alert">{error}</div>}

        {loading ? (
          <div className="cart-loading">Loading your cart…</div>
        ) : unavailable ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <h2>Cart & checkout are on the way</h2>
            <p>
              Online ordering is being set up as part of a later phase. You can browse the full
              catalogue in the meantime.
            </p>
            <Link className="button button-primary" to="/products">Browse Products</Link>
          </div>
        ) : items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Start shopping and add your favourite products.</p>
            <Link className="button button-primary" to="/products">Start Shopping</Link>
          </div>
        ) : (
          <>
            <div>
              <div className="cart-heading-row">
                <h1>My Cart</h1>
                <span className="cart-count-badge">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="cart-toolbar">
                <Link className="button button-light" to="/products">← Continue Shopping</Link>
                <button
                  className="text-btn-danger"
                  type="button"
                  onClick={handleClear}
                  disabled={clearBusy}
                >
                  {clearBusy ? "Clearing…" : "🗑 Clear Cart"}
                </button>
              </div>

              <div className="cart-items-list">
                {items.map((item) => {
                  const productName = item.productName || item.product?.name || "Product";
                  const productPrice = item.price ?? item.product?.price ?? 0;
                  const productUnit = item.unit || item.product?.unit || "unit";
                  const productImageUrlValue = item.imageUrl || item.product?.imageUrl || null;
                  const isAvailable =
                    item.available != null ? item.available : item.product?.available !== false;
                  const stockQuantity = item.product?.stockQuantity ?? null;
                  const atStockLimit = stockQuantity != null && item.quantity >= stockQuantity;
                  const lineTotal =
                    item.subtotal != null ? Number(item.subtotal) : Number(productPrice) * item.quantity;
                  const isBusy = busyItemId === item.id;
                  return (
                    <article key={item.id} className="cart-item-card">
                      <img
                        className="cart-item-img"
                        src={productImageUrl(productImageUrlValue)}
                        alt={productName}
                      />
                      <div className="cart-item-info">
                        <p className="cart-item-name" title={productName}>{productName}</p>
                        <div className="cart-item-meta">
                          <span>{fmt(productPrice)} / {productUnit}</span>
                          <span className={`cart-item-avail ${isAvailable ? "avail" : "unavail"}`}>
                            {isAvailable ? "Available" : "Unavailable"}
                          </span>
                        </div>
                        <div className="qty-control">
                          <button
                            className="qty-btn"
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => handleDecrease(item.id)}
                            disabled={isBusy}
                          >−</button>
                          <span className="qty-value">{item.quantity}</span>
                          <button
                            className="qty-btn"
                            type="button"
                            aria-label="Increase quantity"
                            title={atStockLimit ? `Only ${stockQuantity} available in stock` : undefined}
                            onClick={() => handleIncrease(item.id)}
                            disabled={isBusy || atStockLimit}
                          >+</button>
                        </div>
                      </div>
                      <div className="cart-item-actions">
                        <span className="cart-item-total">{fmt(lineTotal)}</span>
                        <button
                          className="remove-btn"
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          disabled={isBusy}
                          aria-label={`Remove ${productName}`}
                        >🗑 Remove</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="order-summary" aria-label="Order summary">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Subtotal ({items.length} {items.length === 1 ? "item" : "items"})</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <hr className="summary-divider" />
              <div className="summary-total">
                <span>Grand Total</span>
                <span>{fmt(grandTotal)}</span>
              </div>
              <button className="checkout-btn" type="button" disabled>
                Proceed to Checkout →
              </button>
            </aside>
          </>
        )}
      </div>
    </main>
  );
}