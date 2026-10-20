import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { addToCart, getProductCategories, getProducts } from "../services/api";
import { PRODUCT_PLACEHOLDER, productImageUrl } from "../utils/mediaHelpers";

const ALL = "ALL";

export default function ProductsPage() {
  const { user } = useAuth();
  const { refresh: refreshCart } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState(ALL);
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cartingProductId, setCartingProductId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  // Per-product quantity selector. The existing cart API already accepts a
  // quantity, and the default of 1 keeps the current Add-to-Cart behaviour.
  const [quantities, setQuantities] = useState({});

  // Keeps the selected main-category tab visible inside its own (horizontally
  // scrollable on mobile) strip, without scrolling the whole page. The first
  // run is skipped so a normal page load never moves anything.
  const activeTabRef = useRef(null);
  const skippedInitialTabScroll = useRef(false);

  useEffect(() => {
    if (!skippedInitialTabScroll.current) {
      skippedInitialTabScroll.current = true;
      return;
    }
    activeTabRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [selectedParentId]);

  useEffect(() => {
    loadCatalog();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The URL carries whichever category is selected (a parent or a
  // subcategory id). Resolve it against the freshly loaded hierarchy so deep
  // links such as /products?categoryId=12 keep working.
  useEffect(() => {
    const param = searchParams.get("categoryId");

    if (!param) {
      setSelectedParentId(ALL);
      setSelectedSubId(null);
      return;
    }

    const asParent = categories.find((category) => String(category.id) === String(param));
    if (asParent) {
      setSelectedParentId(String(asParent.id));
      setSelectedSubId(null);
      return;
    }

    for (const parent of categories) {
      const sub = (parent.children || []).find((child) => String(child.id) === String(param));
      if (sub) {
        setSelectedParentId(String(parent.id));
        setSelectedSubId(String(sub.id));
        return;
      }
    }

    // Unknown id (e.g. stale link): fall back to showing everything.
    setSelectedParentId(ALL);
    setSelectedSubId(null);
  }, [searchParams, categories]);

  async function loadCatalog() {
    try {
      const [categoryResponse, productResponse] = await Promise.all([
        getProductCategories(),
        getProducts()
      ]);
      setCategories(Array.isArray(categoryResponse) ? categoryResponse : []);
      setProducts(Array.isArray(productResponse) ? productResponse : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load product catalog.");
    } finally {
      setLoading(false);
    }
  }

  function syncParams(value) {
    if (!value || value === ALL) {
      setSearchParams({});
    } else {
      setSearchParams({ categoryId: String(value) });
    }
  }

  function selectAll() {
    setSelectedParentId(ALL);
    setSelectedSubId(null);
    syncParams(ALL);
  }

  function selectParent(parentId) {
    setSelectedParentId(String(parentId));
    setSelectedSubId(null);
    syncParams(parentId);
  }

  function selectSubcategory(parentId, subId) {
    setSelectedParentId(String(parentId));
    setSelectedSubId(String(subId));
    syncParams(subId);
  }

  const normalizedProducts = useMemo(
    () => products.map((product) => ({
      ...product,
      categoryId: product.categoryId ?? product.category?.id ?? null,
      parentCategoryId: product.category?.parentId ?? product.categoryParentId ?? null
    })),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const seen = new Set();
    const result = [];

    for (const product of normalizedProducts) {
      let include;
      if (selectedParentId === ALL) {
        include = true;
      } else if (selectedSubId) {
        // Subcategory: only products assigned directly to it.
        include = String(product.categoryId) === String(selectedSubId);
      } else {
        // Parent: products assigned directly to it AND to its subcategories.
        include =
          String(product.categoryId) === String(selectedParentId) ||
          (product.parentCategoryId != null &&
            String(product.parentCategoryId) === String(selectedParentId));
      }

      // Product-name search works together with the selected category.
      if (include && term && !String(product.name || "").toLowerCase().includes(term)) {
        include = false;
      }

      // Guard against any duplicate rows from the parent + descendant match.
      if (include && !seen.has(product.id)) {
        seen.add(product.id);
        result.push(product);
      }
    }

    return result;
  }, [normalizedProducts, selectedParentId, selectedSubId, searchTerm]);

  const searchActive = searchTerm.trim().length > 0;

  function quantityFor(productId) {
    return quantities[productId] || 1;
  }

  function maxQuantityFor(product) {
    // Never above the stock already returned by the API; at least 1 so an
    // out-of-stock product still shows a usable control.
    return Math.max(1, Number(product.stockQuantity ?? 0));
  }

  function changeQuantity(productId, value) {
    setQuantities((current) => ({ ...current, [productId]: value }));
  }

  const activeParent = useMemo(
    () => categories.find((category) => String(category.id) === String(selectedParentId)) || null,
    [categories, selectedParentId]
  );

  const subcategories = activeParent?.children || [];

  const activeSub = useMemo(
    () => subcategories.find((child) => String(child.id) === String(selectedSubId)) || null,
    [subcategories, selectedSubId]
  );

  async function handleAddToCart(productId, quantity = 1) {
    if (!user) {
      navigate("/login", {
        state: { message: "Please log in to add products to your cart." }
      });
      return;
    }
    try {
      setCartingProductId(productId);
      setError("");
      setSuccessMessage("");
      await addToCart(productId, quantity);
      setSuccessMessage("Added to cart successfully.");
      refreshCart();
      // Reset this product's quantity selector after a successful add.
      setQuantities((current) => {
        if (!(productId in current)) return current;
        const next = { ...current };
        delete next[productId];
        return next;
      });
    } catch (cartError) {
      setError(cartError.message || "Unable to add this product to the cart.");
    } finally {
      setCartingProductId(null);
    }
  }

  return (
    <main className="products-page">
      <SiteHeader showLogin />

      <section className="products-shell">
        <div className="products-header">
          <div>
            <span className="eyebrow">Sutantra Foods</span>
            <h1>Products</h1>
          </div>
          <form
            className="products-search"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <label className="sr-only" htmlFor="products-search-input">
              Search products by name
            </label>
            <span className="products-search-icon" aria-hidden="true">🔍</span>
            <input
              id="products-search-input"
              type="search"
              placeholder="Search products by name…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            {searchActive && (
              <button
                type="button"
                className="products-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Clear product search"
              >
                ×
              </button>
            )}
          </form>
        </div>

        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          {activeParent && (
            <>
              <span className="crumb-sep" aria-hidden="true">›</span>
              {activeSub ? (
                <button
                  type="button"
                  className="crumb-link-btn"
                  onClick={() => selectParent(activeParent.id)}
                >
                  {activeParent.name}
                </button>
              ) : (
                <span className="crumb-current">{activeParent.name}</span>
              )}
            </>
          )}
          {activeSub && (
            <>
              <span className="crumb-sep" aria-hidden="true">›</span>
              <span className="crumb-current">{activeSub.name}</span>
            </>
          )}
        </nav>

        {error && <div className="notice error" role="alert">{error}</div>}
        {successMessage && <div className="notice success" role="status">{successMessage}</div>}

        <nav className="category-tabs" aria-label="Product categories">
          <button
            type="button"
            className={`category-tab ${selectedParentId === ALL ? "active" : ""}`}
            aria-current={selectedParentId === ALL ? "true" : undefined}
            ref={(element) => {
              if (element && selectedParentId === ALL) activeTabRef.current = element;
            }}
            onClick={selectAll}
          >
            All Products
          </button>
          {categories.map((category) => {
            const isSelected = String(category.id) === String(selectedParentId);
            return (
              <button
                key={category.id}
                type="button"
                className={`category-tab ${isSelected ? "active" : ""}`}
                aria-current={isSelected ? "true" : undefined}
                ref={(element) => {
                  if (element && isSelected) activeTabRef.current = element;
                }}
                onClick={() => selectParent(category.id)}
              >
                {category.name}
              </button>
            );
          })}
        </nav>

        {activeParent && subcategories.length > 0 && (
          <nav className="subcategory-tabs" aria-label={`${activeParent.name} subcategories`}>
            <span className="section-label">Subcategories</span>
            <button
              type="button"
              className={`category-tab sub ${!selectedSubId ? "active" : ""}`}
              aria-current={!selectedSubId ? "true" : undefined}
              onClick={() => selectParent(activeParent.id)}
            >
              All {activeParent.name}
            </button>
            {subcategories.map((sub) => {
              const isSubSelected = String(sub.id) === String(selectedSubId);
              return (
                <button
                  key={sub.id}
                  type="button"
                  className={`category-tab sub ${isSubSelected ? "active" : ""}`}
                  aria-current={isSubSelected ? "true" : undefined}
                  onClick={() => selectSubcategory(activeParent.id, sub.id)}
                >
                  {sub.name}
                </button>
              );
            })}
          </nav>
        )}

        {loading ? (
          <div className="status-card">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="status-card">
            <p className="status-card-title">
              {searchActive
                ? `No products match “${searchTerm.trim()}”${
                    activeParent ? ` in ${activeParent.name}` : ""
                  }.`
                : "No products available in this category right now."}
            </p>
            <div className="status-card-actions">
              {searchActive && (
                <button
                  className="button button-light"
                  type="button"
                  onClick={() => setSearchTerm("")}
                >
                  Clear search
                </button>
              )}
              {activeParent && (
                <button
                  className="button button-light"
                  type="button"
                  onClick={() => selectParent(activeParent.id)}
                >
                  View all {activeParent.name}
                </button>
              )}
              {selectedParentId !== ALL && (
                <button className="button button-light" type="button" onClick={selectAll}>
                  All Products
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => {
              const qty = quantityFor(product.id);
              const maxQty = maxQuantityFor(product);
              const isCarting = cartingProductId === product.id;
              const unavailable = product.available === false;

              return (
                <article key={product.id} className="product-card">
                  <img
                    className="product-image"
                    src={productImageUrl(product.imageUrl)}
                    alt={product.name}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = PRODUCT_PLACEHOLDER;
                    }}
                  />
                  <div className="product-card-body">
                    <h3 className="product-name" title={product.name}>{product.name}</h3>
                    <div className="product-info">
                      <span className="product-price">
                        ₹{Number(product.price || 0).toFixed(2)}
                        {product.unit ? ` / ${product.unit}` : ""}
                      </span>
                      <span className={`product-status ${unavailable ? "off" : ""}`}>
                        {unavailable ? "Unavailable" : "Available"}
                      </span>
                    </div>
                    <div className="product-stock">
                      {Number(product.stockQuantity ?? 0) > 0
                        ? `In stock: ${product.stockQuantity}`
                        : "Out of stock"}
                    </div>
                    <div className="product-actions">
                      <div className="qty-control product-qty">
                        <button
                          className="qty-btn"
                          type="button"
                          aria-label={`Decrease quantity of ${product.name}`}
                          onClick={() => changeQuantity(product.id, qty - 1)}
                          disabled={isCarting || qty <= 1}
                        >−</button>
                        <span className="qty-value">{qty}</span>
                        <button
                          className="qty-btn"
                          type="button"
                          aria-label={`Increase quantity of ${product.name}`}
                          title={qty >= maxQty ? `Only ${maxQty} available in stock` : undefined}
                          onClick={() => changeQuantity(product.id, qty + 1)}
                          disabled={isCarting || qty >= maxQty}
                        >+</button>
                      </div>
                      <button
                        className="button button-primary"
                        type="button"
                        onClick={() => handleAddToCart(product.id, qty)}
                        disabled={isCarting || unavailable}
                        aria-label={`Add ${product.name} to cart`}
                      >
                        {isCarting ? "Adding…" : "🛒 Add to Cart"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
