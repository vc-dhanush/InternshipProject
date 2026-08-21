import { Link } from "react-router-dom";
import { Icon } from "./Icons";

const actions = [
  { to: "/app/attendance", label: "Take attendance", icon: "attendance" },
  { to: "/app/classes", label: "Add class", icon: "classes" },
  { to: "/app/classes", label: "Add student", icon: "students" },
  { to: "/app/tests", label: "Create test", icon: "tests" },
];

export default function QuickActions() {
  return (
    <section className="card panel">
      <h3>Quick actions</h3>
      <div className="quick-actions">
        {actions.map((a) => (
          <Link key={a.label} to={a.to} className="quick-action">
            <Icon name={a.icon} size={18} />
            {a.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
