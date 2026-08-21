import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import { Spinner } from "../components/ui";

export default function StudentProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/students/${id}`).then(({ data: d }) => setData(d));
  }, [id]);

  if (!data) return <Spinner label="Loading student…" />;
  const s = data.student;
  const a = data.attendance;
  const ac = data.academic;

  return (
    <div>
      <div className="card profile-head">
        {s.profilePicture ? <img src={s.profilePicture} alt="" /> : <div className="ph" />}
        <div>
          <h2 style={{ margin: 0 }}>{s.name}</h2>
          <p className="muted">Roll {s.rollNo} • ID {s.studentId} • {s.class?.name}</p>
          <p>
            Attendance <strong>{a.percentage}%</strong> ({a.present} present / {a.absent} absent of {a.totalClasses})
          </p>
          <p>
            Tests {ac.testsAttempted} • Average {ac.averageMarks}% • High {ac.highestMarks}% • Low {ac.lowestMarks}%
          </p>
        </div>
      </div>
      <div className="chart-grid" style={{ marginTop: 16 }}>
        <div className="card page-card">
          <h3>Attendance history</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Subject</th><th>Status</th></tr></thead>
              <tbody>
                {data.history.map((h) => (
                  <tr key={h._id}>
                    <td>{h.session?.date}</td>
                    <td>{h.session?.subject}</td>
                    <td><span className={`badge ${h.status === "present" ? "ok" : "warn"}`}>{h.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card page-card">
          <h3>Test marks</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Test</th><th>Marks</th></tr></thead>
              <tbody>
                {data.marks.map((m) => (
                  <tr key={m._id}>
                    <td>{m.test?.name}</td>
                    <td>{m.obtainedMarks} / {m.test?.totalMarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
