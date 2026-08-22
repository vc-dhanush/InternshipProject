import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import { EmptyState, Spinner } from "../components/ui";
import { initials } from "../components/Icons";

export default function StudentProfile() {
  const { studentId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/students/${studentId}`)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div className="card panel"><Spinner label="Loading student…" /></div>;
  if (error || !data) {
    return (
      <div className="card panel error-panel">
        <h3>Unable to open this student.</h3>
        <p className="muted">{error || "You may not have access to this record."}</p>
        <Link className="btn secondary" to="/app/classes">Back to classes</Link>
      </div>
    );
  }

  const s = data.student;
  const att = data.attendance || {};
  const tests = data.tests || {};

  return (
    <div>
      <PageHeader title={s.name} text={`${s.class?.name || "Class"} · ${s.studentId}`} />
      <div className="card profile-head">
        {s.profilePicture ? <img src={s.profilePicture} alt="" /> : <div className="ph">{initials(s.name)}</div>}
        <div>
          <p><strong>Student ID:</strong> {s.studentId}</p>
          <p><strong>Class:</strong> {s.class?.name} {s.class?.section ? `· ${s.class.section}` : ""} · {s.class?.subject}</p>
          <p><strong>Email:</strong> {s.email || "—"}</p>
          <p><strong>Phone:</strong> {s.phone || "—"}</p>
          {s.archived && <span className="badge muted">Archived</span>}
        </div>
      </div>
      <div className="chart-grid" style={{ marginTop: 16 }}>
        <section className="card panel">
          <h3>Attendance</h3>
          {att.totalClasses ? (
            <div className="kpis">
              <div className="kpi"><span className="muted">Attendance %</span><b>{att.percentage}%</b></div>
              <div className="kpi"><span className="muted">Present</span><b>{att.present}</b></div>
              <div className="kpi"><span className="muted">Absent</span><b>{att.absent}</b></div>
              <div className="kpi"><span className="muted">Classes</span><b>{att.totalClasses}</b></div>
            </div>
          ) : (
            <EmptyState title="No attendance yet" text="Attendance appears here after sessions are saved for this class." />
          )}
        </section>
        <section className="card panel">
          <h3>Tests</h3>
          {tests.testsTaken ? (
            <div className="kpis">
              <div className="kpi"><span className="muted">Tests taken</span><b>{tests.testsTaken}</b></div>
              <div className="kpi"><span className="muted">Average marks</span><b>{tests.averageMarks}</b></div>
              <div className="kpi"><span className="muted">Highest</span><b>{tests.highest}</b></div>
              <div className="kpi"><span className="muted">Lowest</span><b>{tests.lowest}</b></div>
            </div>
          ) : (
            <EmptyState title="No tests yet" text="Marks appear here after tests are created and scores are entered." />
          )}
        </section>
      </div>
    </div>
  );
}
