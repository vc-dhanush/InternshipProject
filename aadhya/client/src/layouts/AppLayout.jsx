import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Header from "./Header";
import Sidebar from "./Sidebar";

const titles = {
  "/app/dashboard": "Dashboard",
  "/app/classes": "Classes",
  "/app/attendance": "Attendance",
  "/app/tests": "Tests & Marks",
  "/app/reports": "Reports",
  "/app/staff": "Staff profile",
  "/app/profile": "Staff profile",
  "/app/settings": "Settings",
  "/app/contact": "Contact us",
  "/app/about": "About us",
  "/app/onboarding": "College setup",
};

export default function AppLayout() {
  const { user, settings } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const apply = () => setCollapsed(mq.matches && window.innerWidth > 860);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings?.theme === "dark" ? "dark" : "light");
  }, [settings?.theme]);

  if (!user.onboardingComplete && loc.pathname !== "/app/onboarding") {
    return <Navigate to="/app/onboarding" replace />;
  }

  const title =
    Object.entries(titles).find(([k]) => loc.pathname === k || loc.pathname.startsWith(`${k}/`))?.[1] ||
    "Aadhya";

  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      <button
        type="button"
        className={`drawer-back ${open ? "show" : ""}`}
        aria-label="Close navigation"
        onClick={() => setOpen(false)}
      />
      <Sidebar open={open} collapsed={collapsed} onNavigate={() => setOpen(false)} />
      <div className="main">
        <Header
          title={title}
          collapsed={collapsed}
          onMenu={() => setOpen(true)}
          onCollapse={() => setCollapsed((c) => !c)}
        />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
