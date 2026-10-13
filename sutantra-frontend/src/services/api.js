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

// Step 1 of the two-step login flow ("Get Verification Code"). Validates that
// the identifier belongs to a registered account. No code is delivered yet;
// real OTP delivery will replace this call later.
export function requestVerificationCode(identifier) {
  return request("/api/auth/request-code", {
    method: "POST",
    body: JSON.stringify({ identifier })
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

// ── Admin: catalogue management (ADMIN + SUPER_ADMIN) ─────────────
//
// Writes are sent as multipart/form-data so image files can travel alongside
// the fields. Boolean fields are serialised as "1"/"0" for Laravel's boolean
// rule; `image` is only appended when the admin picked a new file.

function buildFormData(fields, imageFile) {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "boolean") {
      data.append(key, value ? "1" : "0");
    } else {
      data.append(key, value);
    }
  });
  if (imageFile) {
    data.append("image", imageFile);
  }
  return data;
}

function adminWrite(path, fields, imageFile, method = "POST") {
  return request(path, { method, body: buildFormData(fields, imageFile) });
}

// Products
export function getAdminProducts() {
  return request("/api/admin/products");
}

export function createProduct(fields, imageFile) {
  return adminWrite("/api/admin/products", fields, imageFile);
}

export function updateProduct(id, fields, imageFile) {
  return adminWrite(`/api/admin/products/${id}`, fields, imageFile);
}

export function deleteProduct(id) {
  return request(`/api/admin/products/${id}`, { method: "DELETE" });
}

// Categories
export function getAdminCategories() {
  return request("/api/admin/categories");
}

export function createCategory(fields, imageFile) {
  return adminWrite("/api/admin/categories", fields, imageFile);
}

export function updateCategory(id, fields, imageFile) {
  return adminWrite(`/api/admin/categories/${id}`, fields, imageFile);
}

export function deleteCategory(id) {
  return request(`/api/admin/categories/${id}`, { method: "DELETE" });
}

// Banners
export function getAdminBanners() {
  return request("/api/admin/banners");
}

export function createBanner(fields, imageFile) {
  return adminWrite("/api/admin/banners", fields, imageFile);
}

export function updateBanner(id, fields, imageFile) {
  return adminWrite(`/api/admin/banners/${id}`, fields, imageFile);
}

export function deleteBanner(id) {
  return request(`/api/admin/banners/${id}`, { method: "DELETE" });
}

// Homepage vision (singleton)
export function getAdminVision() {
  return request("/api/admin/vision");
}

export function updateVision(fields) {
  return request("/api/admin/vision", { method: "PUT", body: JSON.stringify(fields) });
}

// Policies
export function getAdminPolicies() {
  return request("/api/admin/policies");
}

export function createPolicy(fields) {
  return request("/api/admin/policies", { method: "POST", body: JSON.stringify(fields) });
}

export function updatePolicy(id, fields) {
  return request(`/api/admin/policies/${id}`, { method: "PUT", body: JSON.stringify(fields) });
}

export function deletePolicy(id) {
  return request(`/api/admin/policies/${id}`, { method: "DELETE" });
}

// Users (SUPER_ADMIN only)
export function getAdminUsers(search = "") {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return request(`/api/admin/users${query}`);
}

export function createUser(fields) {
  return request("/api/admin/users", { method: "POST", body: JSON.stringify(fields) });
}

export function updateUser(id, fields) {
  return request(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(fields) });
}

export function deleteUser(id) {
  return request(`/api/admin/users/${id}`, { method: "DELETE" });
}