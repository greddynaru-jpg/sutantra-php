import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getInvoice } from "../../services/invoiceApi";
import InvoiceDocument from "./InvoiceDocument";
import { CloseIcon } from "./InvoiceIcons";

export default function InvoiceModal({ orderId, onClose }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);

    getInvoice(orderId)
      .then((data) => {
        if (active) setInvoice(data);
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load invoice.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(36, 72, 48, 0.45)"
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Invoice preview"
        style={{
          width: "min(860px, 100%)",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "#FFFDF8",
          borderRadius: 14,
          boxShadow: "0 18px 60px rgba(36,72,48,0.22)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <strong style={{ color: "var(--green)", fontSize: 16 }}>Invoice Preview</strong>
          <button
            className="button button-light"
            type="button"
            onClick={onClose}
            aria-label="Close invoice preview"
            style={{ minHeight: 34, padding: "0 10px", gap: 6, fontSize: 13 }}
          >
            <CloseIcon />
            Close
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {loading && <div className="orders-loading">Loading invoice…</div>}
          {!loading && error && <div className="orders-error" role="alert">{error}</div>}
          {!loading && !error && invoice && <InvoiceDocument invoice={invoice} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
