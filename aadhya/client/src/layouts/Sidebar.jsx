import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { formatTime } from "../utils/format";

const links = [
  { to: "/app/dashboard", label: "Dashboard", ico: "▣" },
  { to: "/app/classes", label: "Classes", ico: "▤" },
  { to: "/app/attendance", label: "Attendance", ico: "✓" },
  { to: "/app/tests", label: "Tests & Marks", ico: "✎" },
  { to: "/app/reports", label: "Reports", ico: "▦" },
  { to: "/app/import", label: "Import Image", ico: "⤒" },
  { to: "/app/profile", label: "Staff Profile", ico: "☺" },
  { to: "/app/settings", label: "Settings", ico: "⚙" },
  { to: "/app/contact", label: "Contact Us", ico: "✉" },
  { to: "/app/about", label: "About Us", ico: "ℹ" },
];

export default function Sidebar({ open, collapsed, onNavigate }) {
  const { user, loginTime, logout, settings } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.fullName || "S")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className={`sidebar ${open ? "open" : ""} ${collapsed ? "is-collapsed" : ""}`}>
      <div className="brand">
        <img src="/assets/logo-placeholder.svg" alt="YOUR LOGO" />
        {!collapsed && (
          <div>
            <h1>{settings?.appName || "Aadhya : attendance tracker"}</h1>
            <span>{settings?.collegeName || "YOUR COLLEGE NAME"}</span>
          </div>
        )}
      </div>
      <div className="nav-section">
        <div className="nav-label">Menu</div>
        {links.slice(0, 6).map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={onNavigate}>
            <span className="nav-ico">{l.ico}</span>
            {!collapsed && l.label}
          </NavLink>
        ))}
        <div className="nav-label">Account</div>
        {links.slice(6).map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={onNavigate}>
            <span className="nav-ico">{l.ico}</span>
            {!collapsed && l.label}
          </NavLink>
        ))}
      </div>
      <div className="sidebar-foot">
        <div className="staff-card">
          {user?.profilePicture ? (
            <img className="avatar" src={user.profilePicture} alt="" />
          ) : (
            <div className="avatar">{initials}</div>
          )}
          {!collapsed && (
            <div className="staff-meta">
              <strong>{user?.fullName}</strong>
              ID {user?.staffId}
              <div>Logged in: {formatTime(loginTime)}</div>
            </div>
          )}
        </div>
        <button
          className="logout-btn"
          type="button"
          onClick={async () => {
            await logout();
            navigate("/auth", { replace: true });
          }}
        >
          Logout
        </button>
        {!collapsed && (
          <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>
            Developed by DHANUSH V C &amp; DINESH DURGAPPA
          </p>
        )}
      </div>
    </aside>
  );
}
