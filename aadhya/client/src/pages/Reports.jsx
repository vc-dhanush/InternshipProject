import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import api from "../services/api";
import { Spinner } from "../components/ui";
import "../utils/charts";

export default function Reports() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [report, setReport] = useState(null);
  const [low, setLow] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data.classes));
    api.get("/reports/low-attendance").then(({ data }) => setLow(data.students));
  }, []);

  async function load() {
    if (!classId) return;
    setBusy(true);
    const { data } = await api.get("/reports/class", { params: { classId } });
    setReport(data);
    setBusy(false);
  }

  return (
    <div>
      <div className="toolbar">
        <select className="select" style={{ maxWidth: 280 }} value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Select class</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn" onClick={load}>View class report</button>
        {classId && (
          <>
            <button className="btn secondary" type="button" onClick={() => download("/reports/export/attendance.csv?classId=" + classId, "attendance-report.csv")}>Export CSV</button>
            <button className="btn secondary" type="button" onClick={() => download("/reports/export/attendance.pdf?classId=" + classId, "attendance-report.pdf")}>Export PDF</button>
          </>
        )}
      </div>
      {busy && <Spinner label="Building report…" />}
      {report && (
        <div className="card page-card" style={{ marginBottom: 16 }}>
          <h3>{report.class.name}</h3>
          <p>Sessions {report.summary.totalClasses} • Present {report.summary.totalPresent} • Absent {report.summary.totalAbsent} • {report.summary.attendancePercentage}%</p>
          <p className="muted">Low attendance threshold: {report.threshold}%</p>
          <Bar
            data={{
              labels: report.students.map((s) => s.name),
              datasets: [{ label: "Attendance %", data: report.students.map((s) => s.percentage), backgroundColor: "#4f46e5" }],
            }}
            options={{ plugins: { legend: { display: false } } }}
          />
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead><tr><th>Roll</th><th>Name</th><th>Total</th><th>Present</th><th>Absent</th><th>%</th><th></th></tr></thead>
              <tbody>
                {report.students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.rollNo}</td>
                    <td><Link to={`/app/students/${s.id}`}>{s.name}</Link></td>
                    <td>{s.totalClasses}</td>
                    <td>{s.present}</td>
                    <td>{s.absent}</td>
                    <td>{s.percentage}%</td>
                    <td>{s.lowAttendance ? <span className="badge warn">Low Attendance</span> : <span className="badge ok">On track</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="card page-card">
        <h3>Low attendance alerts</h3>
        {low.length === 0 ? <p className="muted">No students currently below the configured threshold.</p> : (
          <ul>
            {low.map((s) => (
              <li key={s.id}><Link to={`/app/students/${s.id}`}>{s.name}</Link> — {s.percentage}% ({s.class?.name})</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

async function download(path, filename) {
  const res = await api.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
