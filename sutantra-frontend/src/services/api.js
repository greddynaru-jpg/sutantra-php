// Sutantra Foods API client (Laravel backend, bearer-token auth).
//
// The backend returns Laravel resource payloads wrapped as { data: ... };
// this client unwraps them so components receive plain arrays/objects
// (the same shape the legacy Java frontend used).

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const TOKEN_KEY = "sutantra_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Build a URL for a media file. Database rows store relative references like
 * "products/abc.webp"; files are served through /api/media/{reference}.
 * Segments are encoded individually so slashes stay literal (some production
 * proxies reject %2F).
 */
export function mediaUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  const normalized = path.replace(/^\/+/, "").replace(/^api\/media\//, "");
  const encoded = normalized.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  return `${API_BASE_URL}/api/media/${encoded}`;
}

async function request(path, options = {}) {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new Error(
      "Could not connect to the Sutantra Foods service. Check that the backend is running and try again."
    );
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      {
        401: "Please log in to continue.",
        403: "You do not have permission to perform this action.",
        404: "The requested resource could not be found.",
        409: "Email or phone number is already registered.",
        503: "The service is temporarily unavailable. Please try again."
      }[response.status] ||
      "The request could not be completed. Please try again.";
    throw Object.assign(new Error(message), { status: response.status, payload });
  }

  // Unwrap the standard Laravel resource envelope, when present.
  if (payload && typeof payload === "object" && !Array.isArray(payload) && "data" in payload) {
    return payload.data;
  }
  return payload;
}

// ── Authentication ────────────────────────────────────────────────
// Password-only login; the identifier is a registered email OR phone number.

export function loginUser(identifier, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password })
  });
}

export function registerUser(user) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(user)
  });
}

export function getCurrentUser() {
  return request("/api/auth/me").then((payload) => payload?.user ?? payload);
}

export function updateProfile(profile) {
  return request("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify(profile)
  }).then((payload) => payload?.user ?? payload);
}

export function logoutUser() {
  return request("/api/auth/logout", { method: "POST" });
}

// ── Public catalog & homepage ─────────────────────────────────────

export function getProductCategories() {
  return request("/api/catalog/categories");
}

export function getActiveBanners() {
  return request("/api/catalog/banners");
}

export function getVision() {
  return request("/api/catalog/vision");
}

export function getPublishedPolicies() {
  return request("/api/catalog/policies");
}

export function getPublishedPolicy(slug) {
  return request(`/api/catalog/policies/${encodeURIComponent(slug)}`);
}

export function getProducts() {
  return request("/api/catalog/products");
}

export function getProductsByCategory(categoryId) {
  return request(`/api/catalog/products?category_id=${encodeURIComponent(categoryId)}`);
}

// ── Cart (planned phase; endpoints land with the orders/phase work) ─

export function getCart() {
  return request("/api/cart");
}

export function addToCart(productId, quantity = 1) {
  return request(`/api/cart/items?productId=${productId}&quantity=${quantity}`, {
    method: "POST"
  });
}

export function increaseCartItemQuantity(itemId) {
  return request(`/api/cart/items/${itemId}/increase`, { method: "PATCH" });
}

export function decreaseCartItemQuantity(itemId) {
  return request(`/api/cart/items/${itemId}/decrease`, { method: "PATCH" });
}

export function removeCartItem(itemId) {
  return request(`/api/cart/items/${itemId}`, { method: "DELETE" });
}

export function clearCart() {
  return request("/api/cart", { method: "DELETE" });
}