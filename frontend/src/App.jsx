
import { useEffect, useMemo, useState } from "react";
import "./App.css";



const initialBookings = [
  {
    id: "VR-2048",
    guest: "Aarav Sharma",
    initials: "AS",
    property: "Palm Breeze Villa",
    channel: "Airbnb",
    checkIn: "Oct 22, 2026",
    checkOut: "Oct 26, 2026",
    amount: 42800,
    status: "Confirmed",
    color: "peach",
  },
  {
    id: "VR-2047",
    guest: "Maya Patel",
    initials: "MP",
    property: "The Lakehouse",
    channel: "Vrbo",
    checkIn: "Oct 23, 2026",
    checkOut: "Oct 25, 2026",
    amount: 19600,
    status: "Pending",
    color: "lavender",
  },
  {
    id: "VR-2046",
    guest: "Rohan Mehta",
    initials: "RM",
    property: "Olive Garden Stay",
    channel: "Direct",
    checkIn: "Oct 25, 2026",
    checkOut: "Oct 29, 2026",
    amount: 24800,
    status: "Confirmed",
    color: "mint",
  },
  {
    id: "VR-2045",
    guest: "Ananya Rao",
    initials: "AR",
    property: "Palm Breeze Villa",
    channel: "Airbnb",
    checkIn: "Oct 28, 2026",
    checkOut: "Nov 01, 2026",
    amount: 39200,
    status: "Cancelled",
    color: "blue",
  },
];

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

function Sidebar({ activePage, setActivePage, mobileOpen, setMobileOpen }) {
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
              {item.label === "Reservations" && (
                <span className="nav-count">4</span>
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


function Overview({
  setActivePage,
  bookings,
  setBookings,
  search,
  setSearch,
  properties,
  reservations,
}) {

  const [statusFilter, setStatusFilter] = useState("All bookings");
  const [showFilters, setShowFilters] = useState(false);

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesSearch =
        !term ||
        booking.guest.toLowerCase().includes(term) ||
        booking.property.toLowerCase().includes(term) ||
        booking.id.toLowerCase().includes(term) ||
        booking.channel.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All bookings" || booking.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  function confirmBooking(id) {
    setBookings((current) =>
      current.map((booking) =>
        booking.id === id ? { ...booking, status: "Confirmed" } : booking,
      ),
    );
  }

  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> YOUR BUSINESS AT A GLANCE
          </div>
          <h1>Good morning, Alex <span className="wave">✳</span></h1>
          <p className="page-subtitle">
            Here’s what’s happening with your properties today.
          </p>
        </div>
        <button className="primary-button" onClick={() => setActivePage("Properties")}>
          <Icon name="plus" size={18} /> Add property
        </button>
      </section>

      <section className="metric-grid" aria-label="Business metrics">
        <MetricCard
          label="Total properties"
          value={properties.length}
          change=""
          detail="Properties from FastAPI"
          icon="home"
          tone="tone-mint"
        />
        <MetricCard
          label="Active reservations"
          value={reservations.filter(
           (reservation) => reservation.status === "Confirmed"
          ).length}
          change="+12.8%"
          detail="vs. last month"
          icon="calendar"
          tone="tone-blue"
        />
        <MetricCard
          label="Occupancy rate"
          value="78.4%"
          change="+5.2%"
          detail="vs. last month"
          icon="overview"
          tone="tone-peach"
        />
        <MetricCard
          label="Revenue this month"
          value="₹4.82L"
          change="+18.6%"
          detail="vs. last month"
          icon="up"
          tone="tone-lavender"
        />
      </section>

      <section className="insights-grid">
        <article className="panel revenue-panel">
          <div className="panel-heading">
            <div>
              <h2>Revenue overview</h2>
              <p>Your earnings performance over time</p>
            </div>
            <select className="select-control" defaultValue="6 months" aria-label="Revenue period">
              <option>6 months</option>
              <option>3 months</option>
              <option>12 months</option>
            </select>
          </div>

          <div className="revenue-summary">
            <strong>₹28,64,500</strong>
            <span className="trend trend-up"><Icon name="up" size={14} /> 18.6%</span>
            <span className="revenue-caption">total revenue</span>
          </div>

          <div className="chart" role="img" aria-label="Illustrative revenue chart from May to October">
            <div className="chart-y-labels">
              <span>₹6L</span><span>₹4L</span><span>₹2L</span><span>₹0</span>
            </div>
            <div className="chart-main">
              <div className="chart-grid-lines">
                <span /><span /><span /><span />
              </div>
              <svg className="chart-svg" viewBox="0 0 620 180" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#159a85" stopOpacity=".2" />
                    <stop offset="100%" stopColor="#159a85" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,142 C35,132 55,118 92,125 S145,95 185,106 S245,72 278,92 S330,75 370,79 S430,48 465,62 S530,24 560,42 S600,18 620,22 L620,180 L0,180 Z"
                  fill="url(#revenueFill)"
                />
                <path
                  d="M0,142 C35,132 55,118 92,125 S145,95 185,106 S245,72 278,92 S330,75 370,79 S430,48 465,62 S530,24 560,42 S600,18 620,22"
                  fill="none"
                  stroke="#159a85"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx="465" cy="62" r="5" fill="#fff" stroke="#159a85" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="chart-months">
                <span>May</span><span>Jun</span><span>Jul</span>
                <span>Aug</span><span>Sep</span><span>Oct</span>
              </div>
            </div>
          </div>
          <p className="chart-note">Illustrative sample data for the dashboard preview.</p>
        </article>

        <article className="panel channel-panel">
          <div className="panel-heading">
            <div>
              <h2>Channel performance</h2>
              <p>Your listing distribution</p>
            </div>
            <button
              className="icon-button"
              aria-label="View channels"
              onClick={() => setActivePage("Channels")}
            >
              <Icon name="arrow" />
            </button>
          </div>

          <div className="channel-total">
            <strong>36</strong>
            <span>active listings</span>
          </div>

          <div className="channel-bar" aria-label="Airbnb 56 percent, Vrbo 28 percent, Direct 16 percent">
            <span className="bar-airbnb" /><span className="bar-vrbo" /><span className="bar-direct" />
          </div>

          <div className="channel-row">
            <span className="channel-legend"><i className="legend-dot dot-airbnb" /> Airbnb</span>
            <strong>20 listings</strong>
            <span className="channel-percent">56%</span>
          </div>
          <div className="channel-row">
            <span className="channel-legend"><i className="legend-dot dot-vrbo" /> Vrbo</span>
            <strong>10 listings</strong>
            <span className="channel-percent">28%</span>
          </div>
          <div className="channel-row">
            <span className="channel-legend"><i className="legend-dot dot-direct" /> Direct</span>
            <strong>6 listings</strong>
            <span className="channel-percent">16%</span>
          </div>

          <button className="text-button channel-link" onClick={() => setActivePage("Channels")}>
            Manage channels <Icon name="arrow" size={15} />
          </button>
        </article>
      </section>

      <section className="panel bookings-panel">
        <div className="panel-heading bookings-heading">
          <div>
            <h2>Recent reservations</h2>
            <p>Keep track of your latest guest bookings</p>
          </div>
          <button className="text-button" onClick={() => setActivePage("Reservations")}>
            View all reservations <Icon name="arrow" size={15} />
          </button>
        </div>

        <div className="table-toolbar">
          <label className="search-field table-search">
            <Icon name="search" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search guests or properties..."
              aria-label="Search reservations"
            />
          </label>
          <div className="filter-wrap">
            <button className="secondary-button" onClick={() => setShowFilters(!showFilters)}>
              <Icon name="filter" size={16} /> Filter
            </button>
            {showFilters && (
              <div className="filter-menu">
                {["All bookings", "Confirmed", "Pending", "Cancelled"].map((status) => (
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
              {filteredBookings.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    <div className="guest-cell">
                      <span className={`guest-avatar avatar-${booking.color}`}>{booking.initials}</span>
                      <span className="guest-details">
                        <strong>{booking.guest}</strong>
                        <small>{booking.id}</small>
                      </span>
                    </div>
                  </td>
                  <td><span className="property-name-cell">{booking.property}</span></td>
                  <td>
                    <span className="date-cell">{booking.checkIn}</span>
                    <span className="date-end">{booking.checkOut}</span>
                  </td>
                  <td><ChannelBadge channel={booking.channel} /></td>
                  <td className="amount-cell">{formatMoney(booking.amount)}</td>
                  <td><StatusBadge status={booking.status} /></td>
                  <td>
                    {booking.status === "Pending" ? (
                      <button
                        className="row-action"
                        onClick={() => confirmBooking(booking.id)}
                        title="Confirm sample booking"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button className="icon-button" aria-label={`More options for ${booking.guest}`}>
                        <Icon name="more" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-state">
                    No reservations match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>Showing {filteredBookings.length} of {bookings.length} sample reservations</span>
          <span className="table-footer-right">Demo data · Not connected to a booking provider</span>
        </div>
      </section>
    </>
  );
}


function PropertiesPage({
  setActivePage,
  properties,
  loading,
  error,
}) {
  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> YOUR PORTFOLIO
          </div>
          <h1>Your properties</h1>
          <p className="page-subtitle">
            Manage your stays, listing details, and availability.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() =>
            window.alert("Property creation will be added in a later step.")
          }
        >
          <Icon name="plus" size={18} /> Add property
        </button>
      </section>

      <div className="property-summary">
        <div>
          <strong>{properties.length}</strong>
          <span>Properties returned by API</span>
        </div>
        <div>
          <strong>
            {properties.filter((p) => p.status === "Published").length}
          </strong>
          <span>Published listings (demo status)</span>
        </div>
        <div>
          <strong>
            {properties.filter((p) => p.status === "Draft").length}
          </strong>
          <span>Draft listings (demo status)</span>
        </div>
      </div>

      {loading && (
        <p role="status" className="demo-note">
          Loading properties from the backend...
        </p>
      )}

      {error && (
        <p role="alert" className="demo-note">
          Could not load properties: {error}
        </p>
      )}

      {!loading && !error && properties.length === 0 && (
        <p className="demo-note">No properties were returned by the API.</p>
      )}

      {!loading && !error && properties.length > 0 && (
        <section className="property-grid">
          {properties.map((property) => (
            <article className="property-card" key={property.id}>
              <div className="property-image-wrap">
                <img
                  src={property.image}
                  alt={property.name}
                  className="property-image"
                  loading="lazy"
                />
                <span
                  className={`property-status ${
                    property.status === "Published" ? "published" : "draft"
                  }`}
                >
                  <span className="status-dot" /> {property.status}
                </span>
                <button
                  className="property-menu icon-button"
                  aria-label={`Options for ${property.name}`}
                >
                  <Icon name="more" />
                </button>
              </div>

              <div className="property-card-body">
                <div className="property-type">{property.type}</div>
                <h3>{property.name}</h3>
                <p className="property-location">{property.location}</p>

                <div className="property-details">
                  <span>
                    <Icon name="users" size={16} /> {property.guests} guests
                  </span>
                  <span>
                    <Icon name="home" size={16} /> {property.bedrooms} bedrooms
                  </span>
                </div>

                <p className="property-location">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: property.currency || "INR",
                    maximumFractionDigits: 0,
                  }).format(property.nightly_rate)}{" "}
                  / night
                </p>

                <button
                  className="property-manage"
                  onClick={() => setActivePage("Calendar")}
                >
                  Manage property <Icon name="arrow" size={15} />
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      <p className="demo-note">
        Property details are fetched from FastAPI. Listing status, guest
        capacity, and photos are demonstration values until those fields are
        stored in the backend.
      </p>
    </>
  );
}

function SimplePage({ page }) {
  const content = {
    Reservations: {
      eyebrow: "BOOKING MANAGEMENT",
      title: "Reservations",
      subtitle: "Review booking activity and keep guest stays organized.",
      icon: "calendar",
      description: "Your reservation workspace is ready for the next development step.",
      details: ["Guest and booking records", "Check-in and check-out dates", "Reservation status tracking"],
    },
    Calendar: {
      eyebrow: "AVAILABILITY",
      title: "Availability calendar",
      subtitle: "Plan property availability and prepare for future calendar sync.",
      icon: "grid",
      description: "A calendar view will be added after the booking API is in place.",
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
      description: "Guest records will be loaded from the backend once we build it.",
      details: ["Guest contact details", "Previous and upcoming stays", "Communication history"],
    },
    Settings: {
      eyebrow: "WORKSPACE",
      title: "Settings",
      subtitle: "Manage your workspace preferences as the product grows.",
      icon: "settings",
      description: "Settings are a placeholder in this initial frontend release.",
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

  const item = content[page] || content.Reservations;

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
  // Existing state variables
  const [activePage, setActivePage] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [bookings, setBookings] = useState(initialBookings);

  // Add the properties API state and useEffect here
    // Properties API state
  const [properties, setProperties] = useState([]);
  
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [reservationsError, setReservationsError] = useState("");
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertiesError, setPropertiesError] = useState("");

  // Fetch properties from the FastAPI backend
  useEffect(() => {
    async function loadProperties() {
      try {
        setLoadingProperties(true);
        setPropertiesError("");

        const response = await fetch(
          "http://127.0.0.1:8000/api/properties"
        );

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        const propertyList = data.properties;

        if (!Array.isArray(propertyList)) {
          throw new Error(
            "The API response does not contain a properties array."
          );
        }

        const displayImages = [
          "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=85",
          "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=900&q=85",
          "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=900&q=85",
        ];

        const displayTypes = ["Villa", "House", "Cottage"];
        const displayGuests = [8, 6, 4];

        const formattedProperties = propertyList.map(
          (property, index) => ({
            ...property,
            type: displayTypes[index % displayTypes.length],
            guests: displayGuests[index % displayGuests.length],
            status: index === 2 ? "Draft" : "Published",
            image: displayImages[index % displayImages.length],
          })
        );

        setProperties(formattedProperties);
      } catch (error) {
        setPropertiesError(
          error.message || "An unexpected error occurred."
        );
      } finally {
        setLoadingProperties(false);
      }
    }

    loadProperties();
  }, []);

useEffect(() => {
  async function loadReservations() {
    try {
      setLoadingReservations(true);
      setReservationsError("");

      const response = await fetch(
        "http://127.0.0.1:8000/api/reservations"
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data.reservations)) {
        throw new Error(
          "The API response does not contain a reservations array."
        );
      }

      setReservations(data.reservations);
    } catch (error) {
      setReservationsError(
        error.message || "Unable to load reservations."
      );
    } finally {
      setLoadingReservations(false);
    }
  }

  loadReservations();
}, []);


  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
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
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search anything..."
                aria-label="Search dashboard reservations"
              />
              <kbd>⌘ K</kbd>
            </label>
            <button className="notification-button icon-button" aria-label="Notifications">
              <Icon name="bell" size={19} />
              <span />
            </button>
            <div className="topbar-divider" />
            <span className="topbar-date">Monday, October 19</span>
          </div>
        </header>

        <div className="page-content">
          {activePage === "Overview" ? (
            <Overview
              setActivePage={setActivePage}
              bookings={bookings}
              setBookings={setBookings}
              search={search}
              setSearch={setSearch}
              properties={properties}
              reservations={reservations}
            />
          ) : activePage === "Properties" ? (
            <PropertiesPage
  setActivePage={setActivePage}
  properties={properties}
  loading={loadingProperties}
  error={propertiesError}
/>
          ) : (
            <SimplePage page={activePage} />
          )}

          <footer className="app-footer">
            <span>© 2026 Staywise · Vacation Rental Channel Manager</span>
            <span><i /> Demo environment · Sample data only</span>
          </footer>
        </div>
      </main>
    </div>
  );
}