import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import {
  FulfilmentOverviewChart,
  OrderTrendChart,
  OrderValueTrendChart,
  StatusDistributionChart
} from "../components/admin/OrderCharts";
import { getAdminOrders, getAdminOrdersAnalytics, getAdminOrderStatuses } from "../services/api";
import { formatCount, formatCurrency, statusTone } from "../utils/orderStatus";

const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" }
];

const EMPTY_SUMMARY = {
  totalOrders: 0,
  todayOrders: 0,
  grossOrderValue: 0,
  paidAmount: 0,
  refundedAmount: 0,
  realizedRevenue: 0,
  pendingPaymentAmount: 0,
  cancelledOrderValue: 0,
  averageOrderValue: 0
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return value;
  }
}

function StatusBadge({ code, label, tone, inactive }) {
  return (
    <span
      className="admin-order-status-badge"
      style={{ background: tone.bg, color: tone.fg }}
      title={inactive ? `${label} (inactive status)` : label}
    >
      {label}
      {inactive && <span className="admin-order-status-inactive">Inactive</span>}
    </span>
  );
}

function PaymentBadge({ status }) {
  const value = String(status || "UNKNOWN").toUpperCase();
  const className = ["PENDING", "PAID", "FAILED", "REFUNDED"].includes(value)
    ? `order-payment-badge ${value.toLowerCase()}`
    : "admin-badge role-user";

  return <span className={className}>{value}</span>;
}

export default function AdminOrdersPage() {
  const [period, setPeriod] = useState("monthly");
  const [anchor, setAnchor] = useState(todayIso);
  const [customFrom, setCustomFrom] = useState(() => `${todayIso().slice(0, 7)}-01`);
  const [customTo, setCustomTo] = useState(todayIso);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [statusDefinitions, setStatusDefinitions] = useState([]);
  const [statusError, setStatusError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const listRef = useRef(null);

  const customInvalid =
    period === "custom" && (!customFrom || !customTo || customFrom > customTo);

  const rangeParams = useMemo(() => {
    if (period === "custom") {
      return { period: "custom", dateFrom: customFrom, dateTo: customTo };
    }

    return { period, anchor };
  }, [period, anchor, customFrom, customTo]);

  useEffect(() => {
    let ignore = false;

    setStatusError("");
    getAdminOrderStatuses()
      .then((data) => {
        if (!ignore) setStatusDefinitions(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!ignore) setStatusError(err.message || "Unable to load status definitions.");
      });

    return () => {
      ignore = true;
    };
  }, [refreshToken]);

  useEffect(() => {
    if (customInvalid) {
      setAnalyticsError("Choose a valid start date and end date.");
      setAnalyticsLoading(false);
      return undefined;
    }

    let ignore = false;
    setAnalyticsLoading(true);
    setAnalyticsError("");

    getAdminOrdersAnalytics(rangeParams)
      .then((data) => {
        if (!ignore) setAnalytics(data);
      })
      .catch((err) => {
        if (!ignore) {
          setAnalyticsError(err.message || "Unable to load order analytics.");
          setAnalytics(null);
        }
      })
      .finally(() => {
        if (!ignore) setAnalyticsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [rangeParams, customInvalid, refreshToken]);

  useEffect(() => {
    if (customInvalid) {
      setOrders([]);
      setPagination(null);
      setListError("Choose a valid start date and end date.");
      setListLoading(false);
      return undefined;
    }

    let ignore = false;
    setListLoading(true);
    setListError("");

    getAdminOrders({
      ...rangeParams,
      search: appliedSearch,
      status,
      page
    })
      .then((res) => {
        if (ignore) return;

        const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setOrders(rows);
        setPagination(res?.meta || null);
      })
      .catch((err) => {
        if (!ignore) {
          setListError(err.message || "Unable to load orders.");
          setOrders([]);
          setPagination(null);
        }
      })
      .finally(() => {
        if (!ignore) setListLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [rangeParams, appliedSearch, status, page, customInvalid, refreshToken]);

  const summary = analytics?.summary || EMPTY_SUMMARY;
  const trend = analytics?.trend || [];
  const rangeLabel = analytics?.range?.label || "Selected period";

  const statusCards = useMemo(() => {
    const map = new Map();

    statusDefinitions.forEach((definition) => {
      const code = String(definition.code || "").toUpperCase();
      if (!code) return;

      map.set(code, {
        id: definition.id,
        code,
        label: definition.label || code,
        is_active: definition.is_active !== false,
        is_protected: Boolean(definition.is_protected),
        is_configured: true,
        count: 0,
        value: 0,
        percentage: 0
      });
    });

    (analytics?.statusBreakdown || []).forEach((item) => {
      const code = String(item.code || "").toUpperCase();
      if (!code) return;

      const existing = map.get(code);

      map.set(code, {
        ...(existing || {
          is_active: item.is_active !== false,
          is_protected: Boolean(item.is_protected),
          is_configured: item.is_configured !== false
        }),
        ...item,
        code,
        label: existing?.label || item.label || code,
        count: Number(item.count) || 0,
        value: Number(item.value) || 0,
        percentage: Number(item.percentage) || 0,
        tone: statusTone(code),
        color: statusTone(code).solid
      });
    });

    return Array.from(map.values()).map((item) => ({
      ...item,
      tone: statusTone(item.code),
      color: statusTone(item.code).solid
    }));
  }, [statusDefinitions, analytics]);

  const statusLookup = useMemo(
    () => new Map(statusCards.map((item) => [item.code, item])),
    [statusCards]
  );

  function labelFor(code) {
    const key = String(code || "").toUpperCase();
    return statusLookup.get(key)?.label || code || "Unknown";
  }

  function toneFor(code) {
    const key = String(code || "").toUpperCase();
    return statusLookup.get(key)?.tone || statusTone(key);
  }

  function scrollToList() {
    listRef.current?.scrollIntoView({ block: "start" });
  }

  function selectStatus(nextStatus) {
    setStatus(nextStatus);
    setPage(1);
    scrollToList();
  }

  function choosePeriod(nextPeriod) {
    setPeriod(nextPeriod);
    setPage(1);
  }

  function chooseAnchor(value) {
    if (!value) return;
    setAnchor(value);
    setPage(1);
  }

  function applySearch(event) {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    setPage(1);
  }

  function resetFilters() {
    setSearchInput("");
    setAppliedSearch("");
    setStatus("");
    setPage(1);
    setPeriod("monthly");
    setAnchor(todayIso());
    setCustomFrom(`${todayIso().slice(0, 7)}-01`);
    setCustomTo(todayIso());
  }

  function refreshData() {
    setRefreshToken((value) => value + 1);
  }

  const currentPage = pagination?.current_page || page;
  const lastPage = pagination?.last_page || 1;
  const totalListOrders = pagination?.total ?? orders.length;
  const showingFrom = pagination?.from ?? (orders.length ? 1 : 0);
  const showingTo = pagination?.to ?? orders.length;

  return (
    <AdminLayout
      title="Order Management"
      subtitle="Monitor orders, analyse trends and manage the fulfilment pipeline."
      actions={
        <div className="admin-orders-header-actions">
          <button className="button button-light" type="button" onClick={refreshData}>
            Refresh data
          </button>
          <Link className="button button-light" to="/admin/order-statuses">
            Manage Statuses
          </Link>
        </div>
      }
    >
      <div className="admin-orders-page">
        <section className="admin-panel admin-orders-controls" aria-labelledby="orders-period-heading">
          <div className="admin-orders-controls-main">
            <span id="orders-period-heading" className="admin-orders-control-label">
              Analytics period
            </span>
            <div className="admin-orders-periods" role="group" aria-labelledby="orders-period-heading">
              {PERIODS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`admin-orders-period${period === option.value ? " is-active" : ""}`}
                  aria-pressed={period === option.value}
                  onClick={() => choosePeriod(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-orders-date-controls">
            {(period === "daily" || period === "weekly") && (
              <label className="admin-orders-date-field">
                <span>{period === "daily" ? "Date" : "Week containing"}</span>
                <input type="date" value={anchor} onChange={(event) => chooseAnchor(event.target.value)} />
              </label>
            )}

            {period === "monthly" && (
              <label className="admin-orders-date-field">
                <span>Month</span>
                <input
                  type="month"
                  value={anchor.slice(0, 7)}
                  onChange={(event) => event.target.value && chooseAnchor(`${event.target.value}-01`)}
                />
              </label>
            )}

            {period === "yearly" && (
              <label className="admin-orders-date-field">
                <span>Year</span>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  step="1"
                  value={anchor.slice(0, 4)}
                  onChange={(event) => event.target.value && chooseAnchor(`${event.target.value}-01-01`)}
                />
              </label>
            )}

            {period === "custom" && (
              <>
                <label className="admin-orders-date-field">
                  <span>From</span>
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo || undefined}
                    onChange={(event) => {
                      setCustomFrom(event.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <label className="admin-orders-date-field">
                  <span>To</span>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom || undefined}
                    onChange={(event) => {
                      setCustomTo(event.target.value);
                      setPage(1);
                    }}
                  />
                </label>
              </>
            )}
          </div>

          <div className="admin-orders-range">
            <span className="admin-orders-range-label">{rangeLabel}</span>
            <span className="admin-orders-range-note">
              {analyticsLoading ? "Updating…" : `Dates use ${analytics?.range?.timezone || "UTC"}`}
            </span>
          </div>
        </section>

        {analyticsError && (
          <div className="admin-panel admin-orders-error" role="alert">
            <span>{analyticsError}</span>
            <button className="button button-light" type="button" onClick={refreshData}>
              Try again
            </button>
          </div>
        )}

        {statusError && (
          <div className="admin-panel admin-orders-error" role="alert">
            <span>{statusError} Status filters will still populate from order analytics.</span>
            <button className="button button-light" type="button" onClick={refreshData}>
              Retry statuses
            </button>
          </div>
        )}

        <section aria-labelledby="orders-summary-heading" aria-busy={analyticsLoading}>
          <div className="admin-orders-section-head">
            <h2 id="orders-summary-heading">Order summary</h2>
            <span>{rangeLabel}</span>
          </div>

          <div className="admin-orders-summary">
            <button
              type="button"
              className={`admin-orders-stat admin-orders-stat-button${status === "" ? " is-active" : ""}`}
              aria-pressed={status === ""}
              onClick={() => selectStatus("")}
            >
              <span className="admin-orders-stat-label">Total Orders</span>
              <strong className="admin-orders-stat-value">{formatCount(summary.totalOrders)}</strong>
              <span className="admin-orders-stat-sub">All statuses · view all orders</span>
            </button>

            <button
              type="button"
              className="admin-orders-stat admin-orders-stat-button"
              onClick={() => {
                setPeriod("daily");
                setAnchor(todayIso());
                setStatus("");
                setPage(1);
                scrollToList();
              }}
            >
              <span className="admin-orders-stat-label">Orders Received Today</span>
              <strong className="admin-orders-stat-value">{formatCount(summary.todayOrders)}</strong>
              <span className="admin-orders-stat-sub">Today · independent of period</span>
            </button>

            <div className="admin-orders-stat">
              <span className="admin-orders-stat-label">Gross Order Value</span>
              <strong className="admin-orders-stat-value">{formatCurrency(summary.grossOrderValue)}</strong>
              <span className="admin-orders-stat-sub">All orders in period · before refunds</span>
            </div>

            <div className="admin-orders-stat">
              <span className="admin-orders-stat-label">Average Order Value</span>
              <strong className="admin-orders-stat-value">{formatCurrency(summary.averageOrderValue)}</strong>
              <span className="admin-orders-stat-sub">Gross value ÷ total orders</span>
            </div>
          </div>

          <div className="admin-orders-finance" aria-label="Financial breakdown">
            <div>
              <span>Paid amount</span>
              <strong>{formatCurrency(summary.paidAmount)}</strong>
              <small>Orders marked PAID</small>
            </div>
            <div>
              <span>Refunded amount</span>
              <strong>{formatCurrency(summary.refundedAmount)}</strong>
              <small>Orders marked REFUNDED</small>
            </div>
            <div>
              <span>Realized revenue</span>
              <strong>{formatCurrency(summary.realizedRevenue)}</strong>
              <small>Paid, excluding cancelled orders</small>
            </div>
            <div>
              <span>Pending payment</span>
              <strong>{formatCurrency(summary.pendingPaymentAmount)}</strong>
              <small>Orders still pending payment</small>
            </div>
            <div>
              <span>Cancelled value</span>
              <strong>{formatCurrency(summary.cancelledOrderValue)}</strong>
              <small>Cancelled orders · excluded from realized revenue</small>
            </div>
          </div>
        </section>

        <section aria-labelledby="orders-status-heading">
          <div className="admin-orders-section-head">
            <h2 id="orders-status-heading">Orders by status</h2>
            <span>Click a status to filter the order list</span>
          </div>

          {statusCards.length === 0 ? (
            <div className="admin-panel admin-empty">
              No order statuses configured.{" "}
              <Link to="/admin/order-statuses">Manage order statuses</Link> to add one.
            </div>
          ) : (
            <div className="admin-orders-status-grid">
              {statusCards.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={`admin-orders-status-card${status === item.code ? " is-active" : ""}`}
                  aria-pressed={status === item.code}
                  onClick={() => selectStatus(item.code)}
                >
                  <span className="admin-orders-status-head">
                    <span className="admin-orders-status-dot" style={{ background: item.color }} aria-hidden="true" />
                    <span className="admin-orders-status-label">{item.label}</span>
                    {item.is_active === false && <span className="admin-order-status-inactive">Inactive</span>}
                  </span>
                  <strong className="admin-orders-status-count">{formatCount(item.count)}</strong>
                  <span className="admin-orders-status-meta">
                    {formatCurrency(item.value)} · {item.percentage}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="orders-charts-heading">
          <div className="admin-orders-section-head">
            <h2 id="orders-charts-heading">Analytics</h2>
            <span>Charts use all statuses in the selected period</span>
          </div>

          {!analytics && analyticsLoading && (
            <div className="admin-panel admin-orders-loading" role="status">
              Loading analytics…
            </div>
          )}

          {analytics && (
            <div className="admin-orders-chart-grid">
              <div className="admin-panel admin-orders-chart-card">
                <div className="admin-orders-chart-head">
                  <h3>Order trends</h3>
                  <span>Order count · {rangeLabel}</span>
                </div>
                <OrderTrendChart data={trend} rangeLabel={rangeLabel} />
              </div>

              <div className="admin-panel admin-orders-chart-card">
                <div className="admin-orders-chart-head">
                  <h3>Status distribution</h3>
                  <span>Share of orders · {rangeLabel}</span>
                </div>
                <StatusDistributionChart data={statusCards} />
              </div>

              <div className="admin-panel admin-orders-chart-card">
                <div className="admin-orders-chart-head">
                  <h3>Order value trends</h3>
                  <span>Gross value in ₹ · before refunds</span>
                </div>
                <OrderValueTrendChart data={trend} rangeLabel={rangeLabel} />
              </div>

              <div className="admin-panel admin-orders-chart-card">
                <div className="admin-orders-chart-head">
                  <h3>Fulfilment overview</h3>
                  <span>Current pipeline · {rangeLabel}</span>
                </div>
                <FulfilmentOverviewChart data={statusCards} />
              </div>
            </div>
          )}
        </section>

        <section ref={listRef} aria-labelledby="orders-list-heading" className="admin-orders-list-section">
          <form className="admin-panel admin-orders-filters" onSubmit={applySearch} role="search">
            <div className="admin-orders-filter-field admin-orders-filter-search">
              <label htmlFor="admin-order-search">Search orders</label>
              <input
                id="admin-order-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Order number, customer name, phone or email"
                maxLength={100}
              />
            </div>

            <div className="admin-orders-filter-field">
              <label htmlFor="admin-order-status">Status</label>
              <select
                id="admin-order-status"
                value={status}
                onChange={(event) => selectStatus(event.target.value)}
              >
                <option value="">All Orders</option>
                {statusCards.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                    {item.is_active === false ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-orders-filter-actions">
              <button className="button button-primary" type="submit">
                Search
              </button>
              <button className="button button-light" type="button" onClick={resetFilters}>
                Reset filters
              </button>
            </div>
          </form>

          <div className="admin-panel admin-orders-list-panel">
            <div className="admin-orders-list-head">
              <div>
                <h2 id="orders-list-heading">
                  {status ? `${labelFor(status)} orders` : "All orders"}
                </h2>
                <p>
                  {rangeLabel}
                  {appliedSearch ? ` · matching “${appliedSearch}”` : ""}
                </p>
              </div>
              <span className="admin-orders-list-count">
                {formatCount(totalListOrders)} {totalListOrders === 1 ? "order" : "orders"}
              </span>
            </div>

            {listLoading && (
              <p className="admin-empty" role="status">
                Loading orders…
              </p>
            )}

            {!listLoading && listError && (
              <div className="admin-orders-error" role="alert">
                <span>{listError}</span>
                <button className="button button-light" type="button" onClick={refreshData}>
                  Try again
                </button>
              </div>
            )}

            {!listLoading && !listError && orders.length === 0 && (
              <div className="admin-empty">
                <p>No orders match these filters.</p>
                <button className="button button-light" type="button" onClick={resetFilters}>
                  Reset filters
                </button>
              </div>
            )}

            {!listLoading && !listError && orders.length > 0 && (
              <div className="admin-table-wrap">
                <table className="admin-table admin-orders-table">
                  <caption className="sr-only">Orders matching the selected filters</caption>
                  <thead>
                    <tr>
                      <th scope="col">Order</th>
                      <th scope="col">Date</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Items</th>
                      <th scope="col">Total</th>
                      <th scope="col">Payment</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="admin-col-actions">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const code = String(order.status || "UNKNOWN").toUpperCase();
                      const definition = statusLookup.get(code);

                      return (
                        <tr key={order.id}>
                          <td className="admin-cell-strong">{order.orderNumber || order.order_number}</td>
                          <td>{formatDate(order.createdAt || order.created_at)}</td>
                          <td>
                            <div>{order.customerName || order.customer_name}</div>
                            <div className="admin-cell-muted">
                              {order.customerPhone || order.customer_phone}
                            </div>
                          </td>
                          <td>{formatCount(order.itemsCount ?? order.items?.length ?? 0)}</td>
                          <td>{formatCurrency(order.totalAmount || order.total_amount, 2)}</td>
                          <td>
                            <PaymentBadge status={order.paymentStatus || order.payment_status} />
                          </td>
                          <td>
                            <StatusBadge
                              code={code}
                              label={definition?.label || order.status || "Unknown"}
                              tone={toneFor(code)}
                              inactive={definition?.is_active === false}
                            />
                          </td>
                          <td className="admin-col-actions">
                            <Link className="admin-link-btn" to={`/admin/orders/${order.id}`}>
                              View Details
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!listLoading && !listError && orders.length > 0 && (
              <div className="admin-orders-pagination">
                <span>
                  Showing {formatCount(showingFrom)}–{formatCount(showingTo)} of{" "}
                  {formatCount(totalListOrders)}
                </span>
                <div className="admin-orders-pagination-actions">
                  <button
                    className="button button-light"
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    Previous
                  </button>
                  <span>
                    Page {currentPage} of {lastPage}
                  </span>
                  <button
                    className="button button-light"
                    type="button"
                    disabled={currentPage >= lastPage}
                    onClick={() => setPage((value) => Math.min(lastPage, value + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
