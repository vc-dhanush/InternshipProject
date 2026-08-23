import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { formatTime } from "../utils/format";
import { Icon, initials } from "../components/Icons";
import BrandMark from "../components/BrandMark";

const mainLinks = [
  { to: "/app/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/app/classes", label: "Classes", icon: "classes" },
  { to: "/app/attendance", label: "Attendance", icon: "attendance" },
  { to: "/app/tests", label: "Tests & Marks", icon: "tests" },
  { to: "/app/assignments", label: "Assignments", icon: "assignments" },
  { to: "/app/seminars", label: "Seminars", icon: "seminars" },
  { to: "/app/reports", label: "Reports", icon: "reports" },
];
const accountLinks = [
  { to: "/app/staff", label: "Staff Profile", icon: "staff" },
  { to: "/app/settings", label: "Settings", icon: "settings" },
];
const infoLinks = [
  { to: "/app/contact", label: "Contact Us", icon: "contact" },
  { to: "/app/about", label: "About Us", icon: "about" },
];

function NavGroup({ title, links, collapsed, onNavigate }) {
  return (
    <div className="nav-section">
      {!collapsed && <div className="nav-label">{title}</div>}
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          onClick={onNavigate}
          title={collapsed ? l.label : undefined}
        >
          <span className="nav-ico">
            <Icon name={l.icon} />
          </span>
          {!collapsed && l.label}
        </NavLink>
      ))}
    </div>
  );
}

export default function Sidebar({ open, collapsed, onNavigate }) {
  const { user, loginTime, logout, settings } = useAuth();
  const navigate = useNavigate();
  const photo = user?.profilePicture;

  return (
    <aside className={`sidebar ${open ? "open" : ""} ${collapsed ? "is-collapsed" : ""}`} aria-label="Main navigation">
      <div className="brand">
        <BrandMark kind="app" name="APP LOGO" />
        {!collapsed && (
          <div>
            <h1>{settings?.appName || "Aadhya : attendance tracker"}</h1>
            <span>{settings?.collegeName || "YOUR COLLEGE NAME"}</span>
          </div>
        )}
      </div>
      <nav>
        <NavGroup title="Main" links={mainLinks} collapsed={collapsed} onNavigate={onNavigate} />
        <NavGroup title="Account" links={accountLinks} collapsed={collapsed} onNavigate={onNavigate} />
        <NavGroup title="Information" links={infoLinks} collapsed={collapsed} onNavigate={onNavigate} />
      </nav>
      <div className="sidebar-foot">
        <div className="staff-card">
          {photo ? (
            <img className="avatar" src={photo} alt="" />
          ) : (
            <div className="avatar" aria-hidden="true">{initials(user?.fullName)}</div>
          )}
          {!collapsed && (
            <div className="staff-meta">
              <strong>{user?.fullName || "Staff member"}</strong>
              Staff ID: {user?.staffId || "—"}
              <div>Logged in</div>
              <div>{formatTime(loginTime)}</div>
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
          <Icon name="logout" size={16} />
          {!collapsed && "Logout"}
        </button>
      </div>
    </aside>
  );
}
