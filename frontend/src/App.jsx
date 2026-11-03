import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import "./App.css";

const navigation = [
  { label: "Overview", icon: "overview" },
  { label: "Properties", icon: "home" },
  { label: "Reservations", icon: "calendar" },
  { label: "Calendar", icon: "grid" },
  { label: "Channels", icon: "channels" },
  { label: "Guests", icon: "users" },
];

function Icon({ name, size = 19 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9M9 20v-7h6v7" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </>
    ),
    channels: (
      <>
        <circle cx="12" cy="12" r="2" />
        <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z" />
      </>
    ),
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    up: <path d="m7 14 5-5 5 5" />,
    down: <path d="m7 10 5 5 5-5" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    filter: (
      <>
        <path d="M4 7h16M7 12h10m-7 5h4" />
        <circle cx="9" cy="7" r="1.5" fill="currentColor" />
        <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };

  return <svg {...common}>{paths[name] || paths.overview}</svg>;
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function Sidebar({ activePage, setActivePage, mobileOpen, setMobileOpen, pendingCount }) {
  return (
    <>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#overview" onClick={() => setActivePage("Overview")}>
          <span className="brand-mark">
            <Icon name="home" size={23} />
          </span>
          <span className="brand-copy">
            <strong>staywise</strong>
            <small>PROPERTY MANAGER</small>
          </span>
        </a>

        <div className="workspace">
          <span className="workspace-avatar">S</span>
          <span className="workspace-copy">
            <strong>Sunrise Stays</strong>
            <small>Property workspace</small>
          </span>
          <Icon name="down" size={15} />
        </div>

        <span className="nav-heading">WORKSPACE</span>
        <nav className="navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${activePage === item.label ? "nav-active" : ""}`}
              onClick={() => {
                setActivePage(item.label);
                setMobileOpen(false);
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.label === "Reservations" && pendingCount > 0 && (
                <span className="nav-count" title="Pending reservations">{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">✦</span>
            <strong>Need a hand?</strong>
            <p>Your property business, made simpler.</p>
            <button onClick={() => setActivePage("Help")}>
              Visit help center <Icon name="arrow" size={14} />
            </button>
          </div>

          <button
            className={`nav-item ${activePage === "Settings" ? "nav-active" : ""}`}
            onClick={() => {
              setActivePage("Settings");
              setMobileOpen(false);
            }}
          >
            <Icon name="settings" />
            <span>Settings</span>
          </button>

          <div className="profile">
            <div className="profile-avatar">AA</div>
            <div className="profile-copy">
              <strong>Alex Anderson</strong>
              <small>Property manager</small>
            </div>
            <button className="icon-button profile-more" aria-label="Profile options">
              <Icon name="more" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function MetricCard({ label, value, change, detail, icon, tone, trend = "up" }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className={`metric-icon ${tone}`}>
          <Icon name={icon} size={20} />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-footer">
        <span className={`trend ${trend === "up" ? "trend-up" : "trend-neutral"}`}>
          {trend === "up" && <Icon name="up" size={14} />}
          {change}
        </span>
        <span className="metric-detail">{detail}</span>
      </div>
    </article>
  );
}

function ChannelBadge({ channel }) {
  const className = channel.toLowerCase().replace(/\s+/g, "-");
  return <span className={`channel-badge channel-${className}`}>{channel}</span>;
}

function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

const AVATAR_COLORS = ["peach", "lavender", "mint", "blue"];
const STATUS_FILTERS = ["All bookings", "Confirmed", "Pending", "Cancelled"];

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 10);
}

function addDaysISO(iso, days) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date - offset).toISOString().slice(0, 10);
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCompactMoney(amount) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(amount >= 1000000 ? 1 : 2).replace(/\.?0+$/, "")}L`;
  if (amount >= 1000) return `₹${Math.round(amount / 1000)}k`;
  return `₹${amount}`;
}

function formatChange(value) {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function bookingCode(id) {
  return `VR-${String(id).padStart(4, "0")}`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="api-error" role="alert">
      <strong>Couldn't load data.</strong> {message}
      {onRetry && (
        <button className="row-action" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

function RevenueChart({ trend }) {
  const max = Math.max(...trend.map((point) => point.revenue), 0);
  const step = max > 300000 ? 100000 : 50000;
  const yMax = Math.max(step, Math.ceil(max / step) * step);
  const width = 620;
  const height = 180;

  const points = trend.map((point, index) => {
    const x = trend.length === 1 ? width / 2 : (index / (trend.length - 1)) * width;
    const y = height - (point.revenue / yMax) * height;
    return [x, y];
  });
  const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const labels = [yMax, (yMax * 2) / 3, yMax / 3, 0];

  return (
    <div
      className="chart"
      role="img"
      aria-label={`Monthly revenue: ${trend.map((p) => `${p.label} ${formatMoney(p.revenue)}`).join(", ")}`}
    >
      <div className="chart-y-labels">
        {labels.map((value) => (
          <span key={value}>{formatCompactMoney(Math.round(value))}</span>
        ))}
      </div>
      <div className="chart-main">
        <div className="chart-grid-lines">
          <span /><span /><span /><span />
        </div>
        <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#159a85" stopOpacity=".2" />
              <stop offset="100%" stopColor="#159a85" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#revenueFill)" />
          <path d={line} fill="none" stroke="#159a85" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="chart-months">
          {trend.map((point) => (
            <span key={point.month}>{point.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChannelPanel({ stats, setActivePage }) {
  const channels = stats?.channels ?? [];
  const label = channels.map((c) => `${c.channel} ${c.share} percent`).join(", ");

  return (
    <article className="panel channel-panel">
      <div className="panel-heading">
        <div>
          <h2>Channel performance</h2>
          <p>Bookings with nights this month, by source</p>
        </div>
        <button className="icon-button" aria-label="View channels" onClick={() => setActivePage("Channels")}>
          <Icon name="arrow" />
        </button>
      </div>

      <div className="channel-total">
        <strong>{stats?.channel_bookings ?? "–"}</strong>
        <span>bookings this month</span>
      </div>

      <div className="channel-bar" aria-label={label}>
        {channels
          .filter((c) => c.share > 0)
          .map((c) => (
            <span
              key={c.channel}
              className={`bar-${c.channel.toLowerCase()}`}
              style={{ width: `${c.share}%`, flex: "0 1 auto" }}
            />
          ))}
      </div>

      {channels.map((c) => (
        <div className="channel-row" key={c.channel}>
          <span className="channel-legend">
            <i className={`legend-dot dot-${c.channel.toLowerCase()}`} /> {c.channel}
          </span>
          <strong>
            {c.bookings} {c.bookings === 1 ? "booking" : "bookings"}
          </strong>
          <span className="channel-percent">{Math.round(c.share)}%</span>
        </div>
      ))}

      <button className="text-button channel-link" onClick={() => setActivePage("Channels")}>
        Manage channels <Icon name="arrow" size={15} />
      </button>
    </article>
  );
}

function ReservationsTable({
  reservations,
  search,
  setSearch,
  onStatusChange,
  busyId,
  footerNote,
  emptyMessage = "No reservations match your search.",
}) {
  const [statusFilter, setStatusFilter] = useState("All bookings");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reservations.filter((r) => {
      const matchesSearch =
        !term ||
        r.guest_name.toLowerCase().includes(term) ||
        r.property_name.toLowerCase().includes(term) ||
        bookingCode(r.id).toLowerCase().includes(term) ||
        r.channel.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "All bookings" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reservations, search, statusFilter]);

  return (
    <>
      <div className="table-toolbar">
        <label className="search-field table-search">
          <Icon name="search" size={17} />
          <input
            id="reservation-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search guests, properties or booking IDs..."
            aria-label="Search reservations"
          />
        </label>
        <div className="filter-wrap">
          <button className="secondary-button" onClick={() => setShowFilters(!showFilters)}>
            <Icon name="filter" size={16} /> {statusFilter === "All bookings" ? "Filter" : statusFilter}
          </button>
          {showFilters && (
            <div className="filter-menu">
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  className={statusFilter === status ? "filter-selected" : ""}
                  onClick={() => {
                    setStatusFilter(status);
                    setShowFilters(false);
                  }}
                >
                  {status}
                  {statusFilter === status && <Icon name="check" size={15} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="table-scroll">
        <table className="booking-table">
          <thead>
            <tr>
              <th>GUEST</th>
              <th>PROPERTY</th>
              <th>CHECK-IN / OUT</th>
              <th>CHANNEL</th>
              <th>AMOUNT</th>
              <th>STATUS</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="guest-cell">
                    <span className={`guest-avatar avatar-${AVATAR_COLORS[r.id % AVATAR_COLORS.length]}`}>
                      {initials(r.guest_name)}
                    </span>
                    <span className="guest-details">
                      <strong>{r.guest_name}</strong>
                      <small>
                        {bookingCode(r.id)} · {r.guests} {r.guests === 1 ? "guest" : "guests"}
                      </small>
                    </span>
                  </div>
                </td>
                <td><span className="property-name-cell">{r.property_name}</span></td>
                <td>
                  <span className="date-cell">{formatDate(r.check_in)}</span>
                  <span className="date-end">
                    {formatDate(r.check_out)} · {r.nights} {r.nights === 1 ? "night" : "nights"}
                  </span>
                </td>
                <td><ChannelBadge channel={r.channel} /></td>
                <td className="amount-cell">{formatMoney(r.total_amount)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <div className="row-actions">
                    {r.status === "Pending" && (
                      <button
                        className="row-action"
                        disabled={busyId === r.id}
                        onClick={() => onStatusChange(r.id, "Confirmed")}
                      >
                        Confirm
                      </button>
                    )}
                    {r.status !== "Cancelled" && (
                      <button
                        className="row-action row-action-quiet"
                        disabled={busyId === r.id}
                        onClick={() => onStatusChange(r.id, "Cancelled")}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" className="empty-state">{emptyMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>
          Showing {filtered.length} of {reservations.length} reservations
        </span>
        <span className="table-footer-right">{footerNote}</span>
      </div>
    </>
  );
}

function NewReservationDialog({ properties, onClose, onCreated }) {
  const today = todayISO();
  const [form, setForm] = useState({
    property_id: properties[0]?.id ?? "",
    guest_name: "",
    channel: "Direct",
    check_in: addDaysISO(today, 7),
    check_out: addDaysISO(today, 10),
    guests: 2,
    status: "Pending",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const property = properties.find((p) => p.id === Number(form.property_id));
  const nights = Math.round(
    (new Date(`${form.check_out}T00:00:00`) - new Date(`${form.check_in}T00:00:00`)) / 86400000,
  );
  const total = property && nights > 0 ? nights * property.nightly_rate : null;

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await api.createReservation({
        ...form,
        property_id: Number(form.property_id),
        guests: Number(form.guests),
      });
      onCreated(created);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="dialog panel" onSubmit={submit} aria-labelledby="new-reservation-title">
        <div className="panel-heading">
          <div>
            <h2 id="new-reservation-title">New reservation</h2>
            <p>The API rejects dates that overlap an existing stay.</p>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        <div className="form-grid">
          <label className="field field-wide">
            <span>Property</span>
            <select id="nr-property" value={form.property_id} onChange={update("property_id")} required>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · sleeps {p.max_guests} · {formatMoney(p.nightly_rate)}/night
                </option>
              ))}
            </select>
          </label>
          <label className="field field-wide">
            <span>Guest name</span>
            <input id="nr-guest" value={form.guest_name} onChange={update("guest_name")} placeholder="e.g. Kavya Reddy" required />
          </label>
          <label className="field">
            <span>Check-in</span>
            <input id="nr-check-in" type="date" value={form.check_in} onChange={update("check_in")} required />
          </label>
          <label className="field">
            <span>Check-out</span>
            <input id="nr-check-out" type="date" value={form.check_out} min={form.check_in} onChange={update("check_out")} required />
          </label>
          <label className="field">
            <span>Guests</span>
            <input
              id="nr-guests"
              type="number"
              min="1"
              max={property?.max_guests ?? 20}
              value={form.guests}
              onChange={update("guests")}
              required
            />
          </label>
          <label className="field">
            <span>Channel</span>
            <select id="nr-channel" value={form.channel} onChange={update("channel")}>
              <option>Direct</option>
              <option>Airbnb</option>
              <option>Vrbo</option>
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select id="nr-status" value={form.status} onChange={update("status")}>
              <option>Pending</option>
              <option>Confirmed</option>
            </select>
          </label>
          <div className="field quote">
            <span>Total</span>
            <strong>{total !== null ? formatMoney(total) : "—"}</strong>
            <small>{nights > 0 ? `${nights} ${nights === 1 ? "night" : "nights"}` : "Pick valid dates"}</small>
          </div>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button" disabled={saving}>
            <Icon name="plus" size={16} /> {saving ? "Saving..." : "Create reservation"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Overview({ setActivePage, stats, reservations, search, setSearch, onStatusChange, busyId, onNew }) {
  const today = todayISO();
  const upcoming = useMemo(
    () =>
      reservations
        .filter((r) => r.check_out >= today && r.status !== "Cancelled")
        .sort((a, b) => a.check_in.localeCompare(b.check_in))
        .slice(0, 6),
    [reservations, today],
  );
  const monthName = new Date().toLocaleDateString("en-IN", { month: "long" });
  const trendTotal = stats ? stats.revenue_trend.reduce((sum, p) => sum + p.revenue, 0) : 0;

  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> YOUR BUSINESS AT A GLANCE
          </div>
          <h1>{greeting()}, Alex <span className="wave">✳</span></h1>
          <p className="page-subtitle">Here’s what’s happening with your properties today.</p>
        </div>
        <button className="primary-button" onClick={onNew}>
          <Icon name="plus" size={18} /> New reservation
        </button>
      </section>

      <section className="metric-grid" aria-label="Business metrics">
        <MetricCard
          label="Total properties"
          value={stats?.properties ?? "–"}
          change=""
          trend="neutral"
          detail="in your portfolio"
          icon="home"
          tone="tone-mint"
        />
        <MetricCard
          label="Active reservations"
          value={stats?.active_reservations ?? "–"}
          change={stats ? `${stats.pending_reservations} pending` : ""}
          trend="neutral"
          detail="confirmed, in-house or upcoming"
          icon="calendar"
          tone="tone-blue"
        />
        <MetricCard
          label={`Occupancy · ${monthName}`}
          value={stats ? `${stats.occupancy_rate}%` : "–"}
          change={formatChange(stats?.occupancy_change)}
          trend={stats?.occupancy_change > 0 ? "up" : "neutral"}
          detail={stats ? `${stats.booked_nights} of ${stats.available_nights} nights` : ""}
          icon="overview"
          tone="tone-peach"
        />
        <MetricCard
          label={`Revenue · ${monthName}`}
          value={stats ? formatCompactMoney(stats.revenue) : "–"}
          change={formatChange(stats?.revenue_change)}
          trend={stats?.revenue_change > 0 ? "up" : "neutral"}
          detail="vs. last month, on the books"
          icon="up"
          tone="tone-lavender"
        />
      </section>

      <section className="insights-grid">
        <article className="panel revenue-panel">
          <div className="panel-heading">
            <div>
              <h2>Revenue overview</h2>
              <p>Confirmed revenue by night stayed, last 6 months</p>
            </div>
          </div>
          <div className="revenue-summary">
            <strong>{formatMoney(trendTotal)}</strong>
            <span className="revenue-caption">total over 6 months</span>
          </div>
          {stats ? <RevenueChart trend={stats.revenue_trend} /> : <div className="chart" />}
          <p className="chart-note">Current month includes confirmed future nights.</p>
        </article>

        <ChannelPanel stats={stats} setActivePage={setActivePage} />
      </section>

      <section className="panel bookings-panel">
        <div className="panel-heading bookings-heading">
          <div>
            <h2>Upcoming stays</h2>
            <p>Guests in-house now and the next arrivals</p>
          </div>
          <button className="text-button" onClick={() => setActivePage("Reservations")}>
            View all reservations <Icon name="arrow" size={15} />
          </button>
        </div>
        <ReservationsTable
          reservations={upcoming}
          search={search}
          setSearch={setSearch}
          onStatusChange={onStatusChange}
          busyId={busyId}
          footerNote="Live data from the FastAPI backend"
          emptyMessage="No upcoming stays."
        />
      </section>
    </>
  );
}

function ReservationsPage({ reservations, search, setSearch, onStatusChange, busyId, onNew }) {
  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> BOOKING MANAGEMENT
          </div>
          <h1>Reservations</h1>
          <p className="page-subtitle">Every booking across Airbnb, Vrbo and direct, newest stays first.</p>
        </div>
        <button className="primary-button" onClick={onNew}>
          <Icon name="plus" size={18} /> New reservation
        </button>
      </section>
      <section className="panel bookings-panel">
        <ReservationsTable
          reservations={reservations}
          search={search}
          setSearch={setSearch}
          onStatusChange={onStatusChange}
          busyId={busyId}
          footerNote="Channels are simulated · no live Airbnb or Vrbo connection"
        />
      </section>
    </>
  );
}

const PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=900&q=85",
];

function PropertiesPage({ setActivePage, properties, reservations }) {
  const today = todayISO();
  const nextArrival = (propertyId) =>
    reservations
      .filter((r) => r.property_id === propertyId && r.status !== "Cancelled" && r.check_in >= today)
      .sort((a, b) => a.check_in.localeCompare(b.check_in))[0];
  const averageRate = properties.length
    ? Math.round(properties.reduce((sum, p) => sum + p.nightly_rate, 0) / properties.length)
    : 0;

  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> YOUR PORTFOLIO
          </div>
          <h1>Your properties</h1>
          <p className="page-subtitle">Listing details, capacity and nightly rates.</p>
        </div>
      </section>

      <div className="property-summary">
        <div>
          <strong>{properties.length}</strong>
          <span>Properties</span>
        </div>
        <div>
          <strong>{properties.reduce((sum, p) => sum + p.max_guests, 0)}</strong>
          <span>Total guest capacity</span>
        </div>
        <div>
          <strong>{formatMoney(averageRate)}</strong>
          <span>Average nightly rate</span>
        </div>
      </div>

      {properties.length === 0 && <p className="demo-note">No properties were returned by the API.</p>}

      <section className="property-grid">
        {properties.map((property, index) => {
          const next = nextArrival(property.id);
          return (
            <article className="property-card" key={property.id}>
              <div className="property-image-wrap">
                <img
                  src={PROPERTY_IMAGES[index % PROPERTY_IMAGES.length]}
                  alt=""
                  className="property-image"
                  loading="lazy"
                />
              </div>
              <div className="property-card-body">
                <div className="property-type">{property.property_type}</div>
                <h3>{property.name}</h3>
                <p className="property-location">{property.location}</p>
                <div className="property-details">
                  <span><Icon name="users" size={16} /> {property.max_guests} guests</span>
                  <span><Icon name="home" size={16} /> {property.bedrooms} {property.bedrooms === 1 ? "bedroom" : "bedrooms"}</span>
                </div>
                <p className="property-location">
                  {formatMoney(property.nightly_rate)} / night
                  {next ? ` · next arrival ${formatDate(next.check_in)}` : " · no upcoming stays"}
                </p>
                <button className="property-manage" onClick={() => setActivePage("Reservations")}>
                  View bookings <Icon name="arrow" size={15} />
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <p className="demo-note">Property photos are placeholders. All other details come from the API.</p>
    </>
  );
}

function SimplePage({ page }) {
  const content = {
    Calendar: {
      eyebrow: "AVAILABILITY",
      title: "Availability calendar",
      subtitle: "Plan property availability and prepare for future calendar sync.",
      icon: "grid",
      description: "A calendar view is the next feature to build on top of the reservations API.",
      details: ["Nightly availability", "Blocked dates", "Pricing and minimum stays"],
    },
    Channels: {
      eyebrow: "DISTRIBUTION",
      title: "Booking channels",
      subtitle: "Explore the channel connections configured for your workspace.",
      icon: "channels",
      description: "These are demonstration entries only. No external account is connected.",
      details: ["Airbnb · Demo connection", "Vrbo · Demo connection", "Direct bookings · Demo channel"],
    },
    Guests: {
      eyebrow: "GUEST EXPERIENCE",
      title: "Guest directory",
      subtitle: "A future home for guest profiles and stay history.",
      icon: "users",
      description: "Guest records will be loaded from the backend in a later step.",
      details: ["Guest contact details", "Previous and upcoming stays", "Communication history"],
    },
    Settings: {
      eyebrow: "WORKSPACE",
      title: "Settings",
      subtitle: "Manage your workspace preferences as the product grows.",
      icon: "settings",
      description: "Settings are a placeholder in this release.",
      details: ["Workspace profile", "Team access and roles", "Notification preferences"],
    },
    Help: {
      eyebrow: "SUPPORT",
      title: "Help center",
      subtitle: "Keep track of guidance for your property management workflow.",
      icon: "users",
      description: "Help documentation will be added as the application develops.",
      details: ["Getting started", "Managing properties", "Understanding channel sync"],
    },
  };

  const item = content[page] || content.Calendar;

  return (
    <section className="simple-page panel">
      <span className="simple-page-icon"><Icon name={item.icon} size={28} /></span>
      <div className="eyebrow"><span className="eyebrow-dot" /> {item.eyebrow}</div>
      <h1>{item.title}</h1>
      <p className="page-subtitle">{item.subtitle}</p>
      <div className="simple-page-note">
        <strong>{item.description}</strong>
        <ul>
          {item.details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
      </div>
      <p className="demo-note">This section is a planned feature, not a live integration yet.</p>
    </section>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [properties, setProperties] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const loadAll = useCallback(async () => {
    setLoadError("");
    try {
      const [propertyList, reservationList, statsData] = await Promise.all([
        api.properties(),
        api.reservations(),
        api.stats(),
      ]);
      setProperties(propertyList);
      setReservations(reservationList);
      setStats(statsData);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  async function changeStatus(id, status) {
    setBusyId(id);
    setActionError("");
    try {
      await api.updateReservationStatus(id, status);
      setNotice(`${bookingCode(id)} ${status.toLowerCase()}.`);
      await loadAll();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreated(reservation) {
    setDialogOpen(false);
    setNotice(`${bookingCode(reservation.id)} created for ${reservation.guest_name}.`);
    await loadAll();
  }

  const pageProps = {
    reservations,
    search,
    setSearch,
    onStatusChange: changeStatus,
    busyId,
    onNew: () => setDialogOpen(true),
  };

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        pendingCount={stats?.pending_reservations ?? 0}
      />

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu-button icon-button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Icon name="menu" size={22} />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{activePage}</strong>
          </div>
          <div className="topbar-actions">
            <label className="search-field global-search">
              <Icon name="search" size={17} />
              <input
                id="global-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reservations..."
                aria-label="Search reservations"
              />
            </label>
            <button className="notification-button icon-button" aria-label="Notifications">
              <Icon name="bell" size={19} />
              <span />
            </button>
            <div className="topbar-divider" />
            <span className="topbar-date">{todayLabel}</span>
          </div>
        </header>

        <div className="page-content">
          {loading && <p role="status" className="demo-note">Loading data from the backend...</p>}
          {loadError && <ErrorBanner message={loadError} onRetry={loadAll} />}
          {actionError && <ErrorBanner message={actionError} />}
          {notice && <p className="toast" role="status">{notice}</p>}

          {activePage === "Overview" ? (
            <Overview setActivePage={setActivePage} stats={stats} {...pageProps} />
          ) : activePage === "Reservations" ? (
            <ReservationsPage {...pageProps} />
          ) : activePage === "Properties" ? (
            <PropertiesPage setActivePage={setActivePage} properties={properties} reservations={reservations} />
          ) : (
            <SimplePage page={activePage} />
          )}

          <footer className="app-footer">
            <span>© 2026 Staywise · Vacation Rental Channel Manager</span>
            <span><i /> Demo environment · Seeded sample bookings</span>
          </footer>
        </div>
      </main>

      {dialogOpen && (
        <NewReservationDialog
          properties={properties}
          onClose={() => setDialogOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
