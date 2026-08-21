import { Link } from "react-router-dom";

export default function ClassSummary({ classes }) {
  if (!classes.length) return null;
  return (
    <section className="card panel">
      <div className="panel-head">
        <h3>Your classes</h3>
        <Link to="/app/classes" className="text-link">View all</Link>
      </div>
      <ul className="class-summary-list">
        {classes.map((cls) => (
          <li key={cls.id}>
            <Link to={`/app/classes/${cls.id}`} className="class-summary-row">
              <div>
                <strong>{cls.name}{cls.section ? ` · ${cls.section}` : ""}</strong>
                <p className="meta">{cls.subject || "No subject"}</p>
              </div>
              <div className="class-summary-metrics">
                <span>{cls.studentCount} students</span>
                <span>{cls.classesConducted} classes</span>
                <span className="metric-strong">
                  {cls.classesConducted ? `${cls.attendancePercentage}% attendance` : "No data yet"}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
