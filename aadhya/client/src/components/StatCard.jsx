import { Icon } from "./Icons";

export default function StatCard({ label, value, hint, icon, tone = "accent" }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon tone-${tone}`} aria-hidden="true">
        <Icon name={icon} size={18} />
      </div>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </article>
  );
}

export function StatSkeleton() {
  return (
    <div className="stat-card skeleton-card" aria-hidden="true">
      <div className="skel skel-icon" />
      <div className="skel skel-line" />
      <div className="skel skel-value" />
    </div>
  );
}
