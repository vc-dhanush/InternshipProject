import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Header from "./Header";
import Sidebar from "./Sidebar";

const titles = {
  "/app/dashboard": "Dashboard",
  "/app/classes": "Classes",
  "/app/attendance": "Attendance",
  "/app/history": "Attendance history",
  "/app/tests": "Tests & Marks",
  "/app/reports": "Reports",
  "/app/import": "Import attendance",
  "/app/profile": "Staff profile",
  "/app/settings": "Settings",
  "/app/contact": "Contact us",
  "/app/about": "About us",
};

export default function AppLayout() {
  const { user } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (!user.onboardingComplete && loc.pathname !== "/app/onboarding") {
    return <Navigate to="/app/onboarding" replace />;
  }

  const title =
    Object.entries(titles).find(([k]) => loc.pathname.startsWith(k))?.[1] ||
    "Aadhya";

  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      <div className={`drawer-back ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <Sidebar open={open} collapsed={collapsed} onNavigate={() => setOpen(false)} />
      <div className="main">
        <Header title={title} onMenu={() => setOpen(true)} onCollapse={() => setCollapsed((c) => !c)} />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
