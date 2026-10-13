import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../contexts/AuthContext";
import { addToCart, getProductCategories, getProducts } from "../services/api";
import { productImageUrl } from "../utils/mediaHelpers";

export default function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cartingProductId, setCartingProductId] = useState(null);

  useEffect(() => {
    const param = searchParams.get("categoryId");
    if (param) {
      setSelectedCategory(String(param));
    } else {
      setSelectedCategory("ALL");
    }
  }, [searchParams]);

  useEffect(() => {
    loadCatalog();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function selectCategory(categoryId) {
    const value = categoryId === "ALL" ? "ALL" : String(categoryId);
    setSelectedCategory(value);
    if (value === "ALL") {
      setSearchParams({});
    } else {
      setSearchParams({ categoryId: value });
    }
  }

  const normalizedProducts = useMemo(
    () => products.map((product) => ({
      ...product,
      categoryId: product.categoryId ?? product.category?.id ?? null
    })),
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "ALL") return normalizedProducts;
    return normalizedProducts.filter(
      (product) => String(product.categoryId) === String(selectedCategory)
    );
  }, [normalizedProducts, selectedCategory]);

  async function handleAddToCart(productId) {
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
      await addToCart(productId, 1);
      setSuccessMessage("Added to cart successfully.");
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
        </div>

        {error && <div className="notice error" role="alert">{error}</div>}
        {successMessage && <div className="notice success" role="status">{successMessage}</div>}

        <div className="category-tabs" aria-label="Product categories">
          <button
            type="button"
            className={`category-tab ${selectedCategory === "ALL" ? "active" : ""}`}
            onClick={() => selectCategory("ALL")}
          >
            ALL
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`category-tab ${selectedCategory === String(category.id) ? "active" : ""}`}
              onClick={() => selectCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="status-card">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="status-card">No products available in this category right now.</div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <article key={product.id} className="product-card">
                <img
                  className="product-image"
                  src={productImageUrl(product.imageUrl)}
                  alt={product.name}
                />
                <div className="product-card-body">
                  <h3 className="product-name" title={product.name}>{product.name}</h3>
                  <div className="product-info">
                    <span className="product-price">₹{Number(product.price || 0).toFixed(2)}</span>
                    <span aria-hidden="true">|</span>
                    <span className="product-unit">{product.unit || "unit"}</span>
                    <span aria-hidden="true">|</span>
                    <span className="product-status">
                      {product.available === false ? "Unavailable" : "Available"}
                    </span>
                  </div>
                  <div className="product-stock">
                    {Number(product.stockQuantity ?? 0) > 0
                      ? `In stock: ${product.stockQuantity}`
                      : "Out of stock"}
                  </div>
                  <div className="product-actions">
                    <button
                      className="button button-primary"
                      type="button"
                      onClick={() => handleAddToCart(product.id)}
                      disabled={cartingProductId === product.id || product.available === false}
                      aria-label={`Add ${product.name} to cart`}
                    >
                      {cartingProductId === product.id ? "Adding…" : "🛒 Add to Cart"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}