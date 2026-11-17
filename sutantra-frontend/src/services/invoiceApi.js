// Invoice-only API helper. It reuses the existing token storage but does not
// change the shared API client used by the rest of the application.
import { getToken } from "./api";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function authHeaders(accept) {
  const token = getToken();
  return {
    Accept: accept,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function throwResponseError(response) {
  let message = "The invoice could not be loaded. Please try again.";
  try {
    const payload = await response.json();
    if (payload?.message) message = payload.message;
  } catch {
    // Keep the fallback message for non-JSON error bodies.
  }
  throw Object.assign(new Error(message), { status: response.status });
}

async function fetchInvoiceResource(orderId, suffix, accept) {
  let response;
  try {
    response = await fetch(
      `${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}${suffix}`,
      { headers: authHeaders(accept) }
    );
  } catch {
    throw new Error(
      "Could not connect to the Sutantra Foods service. Check that the backend is running and try again."
    );
  }
  if (!response.ok) await throwResponseError(response);
  return response;
}

export async function getInvoice(orderId) {
  const response = await fetchInvoiceResource(orderId, "/invoice", "application/json");
  const payload = await response.json();
  return payload?.data ?? payload;
}

export async function downloadInvoice(orderId, orderNumber) {
  const response = await fetchInvoiceResource(orderId, "/invoice/download", "application/pdf");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeNumber = String(orderNumber || "ORDER").replace(/[^A-Za-z0-9._-]/g, "_");

  link.href = url;
  link.download = `SUTANTRA-Invoice-${safeNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
