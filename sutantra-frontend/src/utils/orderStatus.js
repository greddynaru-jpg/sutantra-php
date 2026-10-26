// Deterministic status colours shared by cards, badges and charts. The database
// has no colour column, so the palette is assigned by a stable hash of the
// status code rather than by array position (new statuses do not reshuffle the
// existing colours).
const PALETTE = [
  { solid: "#2F7D4A", bg: "#EAF6E9", fg: "#1F6B3A" },
  { solid: "#B7791F", bg: "#FDF2E3", fg: "#8A5A00" },
  { solid: "#4A6FA5", bg: "#EAF0FA", fg: "#2B4E8A" },
  { solid: "#3C8C8C", bg: "#E7F4F4", fg: "#1F6666" },
  { solid: "#8460A0", bg: "#F3EBF7", fg: "#6A3C82" },
  { solid: "#8C8570", bg: "#F7F3EB", fg: "#5E5A4D" },
  { solid: "#6E9236", bg: "#EDF6E4", fg: "#4C6B24" },
  { solid: "#A05270", bg: "#FAECF1", fg: "#7A3550" },
  { solid: "#527A67", bg: "#EAF0ED", fg: "#2F5847" },
  { solid: "#B4554C", bg: "#FCE9E7", fg: "#8A2F28" },
  { solid: "#A65A2E", bg: "#FBEDE5", fg: "#7D3F1A" },
  { solid: "#B35680", bg: "#FDEFF5", fg: "#8A2E5C" },
  { solid: "#3F7F95", bg: "#EAF4F7", fg: "#286174" },
];

function hashCode(value) {
  let hash = 0;
  const text = String(value || "").toUpperCase();

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  return hash;
}

export function statusTone(code) {
  return PALETTE[hashCode(code) % PALETTE.length];
}

export function statusLabel(item) {
  if (!item) return "Unknown";
  return item.label || item.code || "Unknown";
}

export function formatCurrency(value, fractionDigits = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(Number(value) || 0);
}

export function formatCount(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

export function formatCompactCurrency(value) {
  const amount = Number(value) || 0;

  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;

  return `₹${Math.round(amount)}`;
}

