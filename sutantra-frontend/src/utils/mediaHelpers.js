import { mediaUrl } from "../services/api";

// Shared image helpers + fallback placeholders (kept inline as data URIs so
// the app needs no extra assets and gracefully handles missing image files).

export function logoUrl() {
  return mediaUrl("logo/sutantra-foods-logo.jpeg");
}

export const PRODUCT_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><rect width="640" height="420" fill="#f1ebe1"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#536a57" font-family="sans-serif" font-size="28">Sutantra Foods</text></svg>'
)}`;

export const CATEGORY_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="#f1ebe1"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#536a57" font-family="sans-serif" font-size="16">Sutantra Foods</text></svg>'
)}`;

export function productImageUrl(imageUrl) {
  if (!imageUrl) return PRODUCT_PLACEHOLDER;
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("data:")) return imageUrl;
  return mediaUrl(imageUrl);
}

export function categoryImageUrl(imageUrl) {
  if (!imageUrl) return CATEGORY_PLACEHOLDER;
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("data:")) return imageUrl;
  return mediaUrl(imageUrl);
}

/**
 * Only allow banner links to https:// targets or same-origin absolute paths;
 * never javascript: or protocol-relative URLs.
 */
export function isSafeTarget(targetUrl) {
  if (typeof targetUrl !== "string") return false;
  const trimmed = targetUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  return trimmed.startsWith("/") && !trimmed.startsWith("//");
}