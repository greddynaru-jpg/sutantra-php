import { useEffect, useRef, useState } from "react";
import { formatCompactCurrency, formatCount, formatCurrency } from "../../utils/orderStatus";

const WIDTH = 720;
const HEIGHT = 270;
const MIN_WIDTH = 300;
const PAD = { top: 18, right: 18, bottom: 42, left: 58 };

function niceMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;

  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;

  return nice * 10 ** exponent;
}

function TrendChart({ data, metric, kind, title, description, formatValue, formatTick, color, integerScale = false }) {
  const [active, setActive] = useState(null);
  const [chartWidth, setChartWidth] = useState(WIDTH);
  const chartRef = useRef(null);

  useEffect(() => {
    setActive(null);
  }, [data]);

  useEffect(() => {
    const node = chartRef.current;

    if (!node) return undefined;

    const measure = () => {
      setChartWidth(Math.max(MIN_WIDTH, Math.min(WIDTH, Math.round(node.clientWidth))));
    };

    measure();

    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const compact = chartWidth < 520;
  const pad = compact
    ? { top: 14, right: 12, bottom: 38, left: 46 }
    : PAD;
  const height = compact ? 240 : HEIGHT;
  const values = data.map((point) => Number(point[metric]) || 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  const isEmpty = values.every((value) => value === 0);
  const rawMax = Math.max(...values, 0);
  const baseMax = niceMax(rawMax);
  const maxValue = integerScale ? Math.max(4, Math.ceil(baseMax / 4) * 4) : baseMax;
  const innerWidth = chartWidth - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const bandWidth = innerWidth / Math.max(data.length, 1);
  const barWidth = Math.max(4, Math.min(34, bandWidth * 0.58));

  const xFor = (index) => {
    if (data.length <= 1) return pad.left + innerWidth / 2;
    return kind === "bar"
      ? pad.left + bandWidth * (index + 0.5)
      : pad.left + (innerWidth * index) / (data.length - 1);
  };

  const yFor = (value) => pad.top + innerHeight - (value / maxValue) * innerHeight;

  const linePath = data
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(Number(point[metric]) || 0)}`)
    .join(" ");
  const firstX = xFor(0);
  const lastX = xFor(data.length - 1);
  const baseline = pad.top + innerHeight;
  const areaPath = data.length
    ? `${linePath} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`
    : "";

  const tickValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => maxValue * ratio);
  const maxXLabels = compact ? 5 : 8;
  const labelStep = Math.max(1, Math.ceil(data.length / maxXLabels));
  const activePoint = active === null ? null : data[active];
  const tooltipWidth = Math.min(170, chartWidth - 8);
  const tooltipHeight = 52;
  const activeX = active === null ? 0 : xFor(active);
  const activeY = activePoint ? yFor(Number(activePoint[metric]) || 0) : 0;
  const tooltipX = Math.min(Math.max(activeX - tooltipWidth / 2, 4), chartWidth - tooltipWidth - 4);
  const tooltipY = Math.max(activeY - tooltipHeight - 12, 4);

  return (
    <div className="admin-chart" ref={chartRef}>
      <svg
        className="admin-chart-svg"
        viewBox={`0 0 ${chartWidth} ${height}`}
        role="img"
        aria-label={`${title}. ${description}`}
      >
        <title>{title}</title>
        <desc>{description}</desc>

        {tickValues.map((value) => (
          <g key={value}>
            <line
              x1={pad.left}
              x2={chartWidth - pad.right}
              y1={yFor(value)}
              y2={yFor(value)}
              className="admin-chart-grid-line"
            />
            <text x={pad.left - 10} y={yFor(value) + 4} textAnchor="end" className="admin-chart-axis-text">
              {formatTick(value)}
            </text>
          </g>
        ))}

        {kind === "line" ? (
          <>
            {data.length > 1 && <path d={areaPath} fill={color} opacity="0.1" />}
            <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {data.map((point, index) => (
              <g
                key={point.key || index}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
              >
                <circle cx={xFor(index)} cy={yFor(Number(point[metric]) || 0)} r="10" fill="transparent" />
                <circle
                  cx={xFor(index)}
                  cy={yFor(Number(point[metric]) || 0)}
                  r={active === index ? 5 : 3.5}
                  fill={color}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                >
                  <title>{`${point.fullLabel}: ${formatValue(point[metric])}`}</title>
                </circle>
              </g>
            ))}
          </>
        ) : (
          data.map((point, index) => {
            const value = Number(point[metric]) || 0;
            const x = xFor(index) - barWidth / 2;
            const y = yFor(value);
            const height = Math.max(baseline - y, value > 0 ? 2 : 0);

            return (
              <g
                key={point.key || index}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
              >
                <rect x={x - 2} y={pad.top} width={barWidth + 4} height={innerHeight} fill="transparent" />
                <rect x={x} y={y} width={barWidth} height={height} rx="2.5" fill={color}>
                  <title>{`${point.fullLabel}: ${formatValue(point[metric])}`}</title>
                </rect>
              </g>
            );
          })
        )}

        {data.map((point, index) => {
          const showLabel = index % labelStep === 0 || index === data.length - 1;

          if (!showLabel) return null;

          return (
            <text
              key={`label-${point.key || index}`}
              x={xFor(index)}
              y={height - 14}
              textAnchor="middle"
              className="admin-chart-axis-text"
            >
              {point.label}
            </text>
          );
        })}

        {isEmpty && (
          <text x={chartWidth / 2} y={pad.top + innerHeight / 2} textAnchor="middle" className="admin-chart-empty-label">
            No orders in this period
          </text>
        )}

        {activePoint && (
          <g transform={`translate(${tooltipX}, ${tooltipY})`}>
            <rect width={tooltipWidth} height={tooltipHeight} rx="7" fill="#243B2F" opacity="0.97" />
            <text x="11" y="18" fill="#D8E4DA" fontSize="10">
              {activePoint.fullLabel}
            </text>
            <text x="11" y="38" fill="#FFFFFF" fontSize="13" fontWeight="700">
              {formatValue(activePoint[metric])}
            </text>
          </g>
        )}
      </svg>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">{metric === "value" ? "Order value" : "Orders"}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={`sr-${point.key}`}>
              <td>{point.fullLabel}</td>
              <td>{formatValue(point[metric])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <span className="sr-only">Total: {formatValue(total)}</span>
    </div>
  );
}

export function OrderTrendChart({ data, rangeLabel }) {
  return (
    <TrendChart
      data={data}
      metric="count"
      kind="line"
      title="Order trends"
      description={`Number of orders by period for ${rangeLabel}.`}
      formatValue={formatCount}
      formatTick={(value) => formatCount(Math.round(value))}
      color="#2F7D4A"
      integerScale
    />
  );
}

export function OrderValueTrendChart({ data, rangeLabel }) {
  return (
    <TrendChart
      data={data}
      metric="value"
      kind="bar"
      title="Order value trends"
      description={`Gross order value by period for ${rangeLabel}, before refunds.`}
      formatValue={(value) => formatCurrency(value, 2)}
      formatTick={formatCompactCurrency}
      color="#B7791F"
    />
  );
}

export function StatusDistributionChart({ data }) {
  const [active, setActive] = useState(null);

  useEffect(() => {
    setActive(null);
  }, [data]);

  const total = data.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const size = 210;
  const center = size / 2;
  const radius = 74;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const segments = data
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => Number(item.count) > 0)
    .map(({ item, index }) => {
      const length = total > 0 ? (Number(item.count) / total) * circumference : 0;
      const segment = { ...item, index, length, offset };
      offset += length;
      return segment;
    });

  const activeItem = active === null ? null : data[active];
  const centerValue = activeItem ? activeItem.count : total;
  const centerLabel = activeItem ? activeItem.label : "Total orders";
  const centerPercent = activeItem ? activeItem.percentage : total > 0 ? 100 : 0;
  const centerText = centerLabel.length > 18 ? `${centerLabel.slice(0, 17)}…` : centerLabel;

  return (
    <div className="admin-doughnut-layout">
      <div className="admin-doughnut-figure">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Order status distribution. ${total} orders across ${data.length} statuses.`}
        >
          <title>Order status distribution</title>
          <desc>Doughnut chart of order counts by configured status.</desc>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#F0EDE6" strokeWidth={strokeWidth} />
          {segments.map((segment) => (
            <circle
              key={segment.code}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segment.length} ${circumference - segment.length}`}
              strokeDashoffset={-segment.offset}
              transform={`rotate(-90 ${center} ${center})`}
              onMouseEnter={() => setActive(segment.index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(segment.index)}
              onBlur={() => setActive(null)}
            >
              <title>{`${segment.label}: ${formatCount(segment.count)} (${segment.percentage}%)`}</title>
            </circle>
          ))}
          <text x={center} y={center - 12} textAnchor="middle" className="admin-doughnut-total">
            {formatCount(centerValue)}
          </text>
          <text x={center} y={center + 8} textAnchor="middle" className="admin-doughnut-label">
            {centerText}
          </text>
          <text x={center} y={center + 26} textAnchor="middle" className="admin-doughnut-percent">
            {total > 0 ? `${centerPercent}%` : "No orders"}
          </text>
        </svg>
      </div>

      <ul className="admin-chart-legend" aria-label="Order status legend">
        {data.map((item, index) => (
          <li key={item.code}>
            <button
              type="button"
              className="admin-chart-legend-item"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              title={`${item.label}: ${formatCount(item.count)} orders (${item.percentage}%)`}
            >
              <span className="admin-chart-legend-dot" style={{ background: item.color }} aria-hidden="true" />
              <span className="admin-chart-legend-label">{item.label}</span>
              <span className="admin-chart-legend-value">
                {formatCount(item.count)} · {item.percentage}%
              </span>
            </button>
          </li>
        ))}
      </ul>

      <table className="sr-only">
        <caption>Order status distribution</caption>
        <thead>
          <tr>
            <th scope="col">Status</th>
            <th scope="col">Orders</th>
            <th scope="col">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={`sr-status-${item.code}`}>
              <td>{item.label}</td>
              <td>{item.count}</td>
              <td>{item.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FulfilmentOverviewChart({ data }) {
  const total = data.reduce((sum, item) => sum + (Number(item.count) || 0), 0);

  if (!data.length) {
    return <p className="admin-chart-empty">No order statuses configured.</p>;
  }

  return (
    <div className="admin-fulfilment-list">
      {data.map((item) => {
        const percentage = Number(item.percentage) || 0;

        return (
          <div className="admin-fulfilment-row" key={item.code}>
            <div className="admin-fulfilment-head">
              <span className="admin-fulfilment-name">
                {item.label}
                {item.is_active === false && <span className="admin-order-status-inactive">Inactive</span>}
              </span>
              <span className="admin-fulfilment-value">
                {formatCount(item.count)} · {percentage}%
              </span>
            </div>
            <div
              className="admin-fulfilment-track"
              role="meter"
              aria-valuemin="0"
              aria-valuemax={total || 1}
              aria-valuenow={Number(item.count) || 0}
              aria-label={`${item.label}: ${formatCount(item.count)} orders, ${percentage}%`}
            >
              <span
                className="admin-fulfilment-fill"
                style={{ width: `${Math.min(percentage, 100)}%`, background: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
