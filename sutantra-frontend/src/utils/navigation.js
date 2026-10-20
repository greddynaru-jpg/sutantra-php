// Helpers for the post-auth return navigation (e.g. Register → Checkout).
// Only same-origin absolute paths are accepted, so a crafted `?redirect=`
// value can never send a user to another site.

export function safeRedirect(search) {
  const raw = new URLSearchParams(search).get("redirect") || "";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "";
  return raw;
}

export function withRedirect(path, redirect) {
  return redirect ? `${path}?redirect=${encodeURIComponent(redirect)}` : path;
}
