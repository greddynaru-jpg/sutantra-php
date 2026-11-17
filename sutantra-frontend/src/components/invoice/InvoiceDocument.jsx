export default function InvoiceDocument({ invoice }) {
  const cell = {
    padding: "10px 12px",
    borderBottom: "1px solid var(--line)",
    fontSize: 14,
    textAlign: "left"
  };
  const head = {
    ...cell,
    color: "var(--muted)",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: ".04em",
    textTransform: "uppercase"
  };
  const numeric = { ...cell, textAlign: "right", whiteSpace: "nowrap" };
  const sectionTitle = {
    margin: "0 0 8px",
    color: "var(--muted)",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: ".06em"
  };

  return (
    <section className="order-detail-panel" aria-label="Invoice preview">
      <h2>Invoice</h2>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "var(--green)", fontSize: 24, fontWeight: 700 }}>SUTANTRA</div>
          <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: ".08em" }}>TAX INVOICE</div>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.8, textAlign: "right" }}>
          <div>Invoice: <strong>{invoice.invoiceNumber}</strong></div>
          <div>Order: <strong>{invoice.orderNumber}</strong></div>
          <div>Date: {invoice.date}</div>
          <div>Payment: <strong>{invoice.paymentStatusLabel}</strong></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
        <div>
          <div style={sectionTitle}>BILL TO</div>
          <div style={{ fontWeight: 600 }}>{invoice.customerName}</div>
          {invoice.customerEmail && <div style={{ color: "var(--muted)", fontSize: 13 }}>{invoice.customerEmail}</div>}
          {invoice.customerPhone && <div style={{ color: "var(--muted)", fontSize: 13 }}>Phone: {invoice.customerPhone}</div>}
        </div>
        <div>
          <div style={sectionTitle}>DELIVER TO</div>
          {(invoice.deliveryAddress || []).map((line, index) => (
            <div key={index} style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>{line}</div>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={head}>Description</th>
              <th style={head}>Qty</th>
              <th style={{ ...head, textAlign: "right" }}>Unit Price</th>
              <th style={{ ...head, textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item, index) => (
              <tr key={index}>
                <td style={cell}>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  {item.unit && <div style={{ color: "var(--muted)", fontSize: 12 }}>Unit: {item.unit}</div>}
                </td>
                <td style={cell}>{item.quantity}</td>
                <td style={numeric}>{item.unitPrice}</td>
                <td style={{ ...numeric, fontWeight: 700 }}>{item.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="order-detail-totals">
        <div className="order-detail-total-row"><span>Subtotal</span><span>{invoice.subtotal}</span></div>
        <div className="order-detail-total-row"><span>Delivery Charge</span><span>{invoice.deliveryCharge}</span></div>
        <div className="order-detail-total-row"><span>Discount</span><span>{invoice.discount}</span></div>
        <div className="order-detail-total-row"><span>Tax</span><span>{invoice.tax}</span></div>
        <hr className="order-detail-divider" />
        <div className="order-detail-total-row grand"><span>Total</span><span>{invoice.total}</span></div>
      </div>

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, color: "var(--muted)", fontSize: 12 }}>
        Thank you for shopping with SUTANTRA. This is a system-generated invoice.
      </div>
    </section>
  );
}
