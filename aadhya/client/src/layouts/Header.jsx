import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Icon, initials } from "../components/Icons";
import BrandMark from "../components/BrandMark";

export default function Header({ title, onMenu, onCollapse, collapsed }) {
  const { user, settings, logout } = useAuth();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn hamburger" type="button" onClick={onMenu} aria-label="Open navigation">
          <Icon name="menu" />
        </button>
        <button
          className="icon-btn collapse-btn"
          type="button"
          onClick={onCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name="collapse" />
        </button>
        <BrandMark kind="app" name="APP LOGO" />
        <div className="college-chip">
          <BrandMark kind="college" src={settings?.collegeLogo || ""} name={settings?.collegeName || "COLLEGE LOGO"} />
          <span>{settings?.collegeName || "YOUR COLLEGE NAME"}</span>
        </div>
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="topbar-right">
        <button className="icon-btn" type="button" aria-label="Notifications, coming soon" title="Notifications">
          <Icon name="bell" />
        </button>
        <div className="profile-menu" ref={menuRef}>
          <button
            className="profile-trigger"
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {user?.profilePicture ? (
              <img className="avatar sm" src={user.profilePicture} alt="" />
            ) : (
              <span className="avatar sm">{initials(user?.fullName)}</span>
            )}
            <span className="profile-name">{user?.fullName}</span>
            <Icon name="chevron" size={14} />
          </button>
          {menuOpen && (
            <div className="profile-dropdown" role="menu">
              <Link role="menuitem" to="/app/staff" onClick={() => setMenuOpen(false)}>Staff profile</Link>
              <Link role="menuitem" to="/app/settings" onClick={() => setMenuOpen(false)}>Settings</Link>
              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  setMenuOpen(false);
                  await logout();
                  nav("/auth", { replace: true });
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
