import { useAuth } from "../hooks/useAuth";

export default function Header({ title, onMenu, onCollapse }) {
  const { user, settings } = useAuth();
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn hamburger" type="button" onClick={onMenu} aria-label="Open menu">
          ☰
        </button>
        <button className="icon-btn" type="button" onClick={onCollapse} aria-label="Collapse sidebar">
          ⇆
        </button>
        <img src="/assets/logo-placeholder.svg" alt="YOUR LOGO" width="32" height="32" style={{ borderRadius: 8 }} />
        <div className="college-chip">
          {settings?.collegeLogo ? <img src={settings.collegeLogo} alt="YOUR LOGO" /> : <img src="/assets/logo-placeholder.svg" alt="YOUR LOGO" />}
          <span>{settings?.collegeName || "YOUR COLLEGE NAME"}</span>
        </div>
        <h1 className="page-title">{title}</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          {settings?.appName || "Aadhya : attendance tracker"}
        </span>
        <div className="avatar" style={{ width: 36, height: 36, fontSize: 12 }}>
          {(user?.fullName || "S")[0]}
        </div>
      </div>
    </header>
  );
}
