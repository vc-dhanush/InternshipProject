export function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
    classes: <><path d="M4 19V7l8-4 8 4v12" /><path d="M12 7v12" /><path d="M8 11h.01M8 15h.01M16 11h.01M16 15h.01" /></>,
    attendance: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
    tests: <><path d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2z" /></>,
    reports: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 15v4" /><path d="M12 11v8" /><path d="M16 8v11" /></>,
    staff: <><circle cx="12" cy="8" r="3.5" /><path d="M5 19c1.2-3 3.8-4.5 7-4.5s5.8 1.5 7 4.5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5 19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5 19 5" /></>,
    contact: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    about: <><circle cx="12" cy="12" r="9" /><path d="M12 10v6M12 7h.01" /></>,
    logout: <><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    collapse: <><path d="M9 6l-6 6 6 6M21 6l-6 6 6 6" /></>,
    bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
    students: <><circle cx="9" cy="8" r="3" /><circle cx="16" cy="9" r="2.5" /><path d="M3 19c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5M15 19c.4-1.6 1.6-2.8 3.5-3.2" /></>,
    percent: <><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /><path d="M18 6 6 18" /></>,
    marks: <><path d="M4 19h16" /><path d="M7 16V9l5-3 5 3v7" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    chevron: <><path d="m6 9 6 6 6-6" /></>,
    retry: <><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 4v6h-6" /></>,
  };
  return <svg {...common}>{paths[name] || paths.dashboard}</svg>;
}

export function initials(name) {
  return String(name || "S")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
