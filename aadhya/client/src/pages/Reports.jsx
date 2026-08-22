import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import { EmptyState, Spinner } from "../components/ui";
import { downloadApiFile } from "../utils/download";
import "../utils/charts";

export default function Reports() {
  const [tab, setTab] = useState("attendance");
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [classId, setClassId] = useState("");
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [studentId, setStudentId] = useState("");
  const [report, setReport] = useState(null);
  const [studentReport, setStudentReport] = useState(null);
  const [tests, setTests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data.classes)).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    api.get("/students", { params: { classId, limit: 200 } })
      .then(({ data }) => setStudents(data.students))
      .catch((err) => setError(err.message));
  }, [classId]);

  async function loadAttendance() {
    if (!classId) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.get("/reports/class", { params: { classId, subject, from, to } });
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadStudent() {
    if (!studentId) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.get(`/reports/student/${studentId}`);
      setStudentReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadTests() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.get("/reports/tests", { params: { classId, subject } });
      setTests(data.tests);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Reports" text="Attendance, student performance, and test summaries from your records only." />
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button type="button" className={tab === "attendance" ? "on" : ""} onClick={() => setTab("attendance")}>Attendance</button>
        <button type="button" className={tab === "student" ? "on" : ""} onClick={() => setTab("student")}>Student</button>
        <button type="button" className={tab === "tests" ? "on" : ""} onClick={() => { setTab("tests"); loadTests(); }}>Tests</button>
      </div>
      {error && <div className="error">{error}</div>}

      {tab === "attendance" && (
        <>
          <div className="toolbar">
            <select className="select" style={{ maxWidth: 240 }} value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Select class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="input" style={{ maxWidth: 160 }} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <input type="date" className="input" style={{ maxWidth: 160 }} value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" className="input" style={{ maxWidth: 160 }} value={to} onChange={(e) => setTo(e.target.value)} />
            <button className="btn" type="button" onClick={loadAttendance}>View report</button>
            {classId && (
              <>
                <button className="btn secondary" type="button" onClick={() => downloadApiFile(api, `/reports/export/attendance.csv?classId=${classId}`, "attendance-report.csv")}>CSV</button>
                <button className="btn secondary" type="button" onClick={() => downloadApiFile(api, `/reports/export/attendance.pdf?classId=${classId}`, "attendance-report.pdf")}>PDF</button>
              </>
            )}
          </div>
          {busy && <Spinner label="Building report…" />}
          {report && (
            <div className="card page-card">
              <h3>{report.class.name}</h3>
              <p>Sessions {report.summary.totalClasses} · Present {report.summary.totalPresent} · Absent {report.summary.totalAbsent} · {report.summary.attendancePercentage}%</p>
              {report.students.length ? (
                <>
                  <Bar
                    data={{
                      labels: report.students.map((s) => s.name),
                      datasets: [{ label: "Attendance %", data: report.students.map((s) => s.percentage), backgroundColor: "#4f46e5" }],
                    }}
                    options={{ plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: true }}
                  />
                  <div className="table-wrap mobile-cards" style={{ marginTop: 16 }}>
                    <table>
                      <thead><tr><th>Student</th><th>Total classes</th><th>Present</th><th>Absent</th><th>%</th></tr></thead>
                      <tbody>
                        {report.students.map((s) => (
                          <tr key={s.id}>
                            <td data-label="Student"><Link to={`/app/students/${s.id}`}>{s.name}</Link> · {s.studentId}</td>
                            <td data-label="Total">{s.totalClasses}</td>
                            <td data-label="Present">{s.present}</td>
                            <td data-label="Absent">{s.absent}</td>
                            <td data-label="%">{s.percentage}% {s.lowAttendance ? <span className="badge warn">Below {report.threshold}%</span> : null}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <EmptyState title="No students" text="This class has no students to report on." />
              )}
            </div>
          )}
        </>
      )}

      {tab === "student" && (
        <>
          <div className="toolbar">
            <select className="select" style={{ maxWidth: 240 }} value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(""); }}>
              <option value="">Select class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="select" style={{ maxWidth: 240 }} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Select student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.studentId}</option>)}
            </select>
            <button className="btn" type="button" onClick={loadStudent}>View student report</button>
          </div>
          {busy && <Spinner label="Loading student…" />}
          {studentReport && (
            <div className="card page-card">
              <h3>{studentReport.student.name}</h3>
              <p className="muted">{studentReport.student.class?.name} · {studentReport.student.studentId}</p>
              <h4>Attendance</h4>
              <p>
                {studentReport.attendance.percentage}% · {studentReport.attendance.present} present · {studentReport.attendance.absent} absent · {studentReport.attendance.totalClasses} classes
              </p>
              <h4>Tests</h4>
              {studentReport.tests?.testsTaken ? (
                <>
                  <p>
                    {studentReport.tests.testsTaken} tests · avg {studentReport.tests.averageMarks} · high {studentReport.tests.highest} · low {studentReport.tests.lowest} · overall {studentReport.tests.overallPercentage}%
                  </p>
                  <div className="table-wrap mobile-cards">
                    <table>
                      <thead><tr><th>Test</th><th>Marks</th><th>%</th></tr></thead>
                      <tbody>
                        {studentReport.tests.tests.map((t) => (
                          <tr key={t.id}>
                            <td data-label="Test">{t.name}</td>
                            <td data-label="Marks">{t.obtainedMarks} / {t.totalMarks}</td>
                            <td data-label="%">{t.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="muted">No marks recorded yet.</p>
              )}
            </div>
          )}
        </>
      )}

      {tab === "tests" && (
        <>
          <div className="toolbar">
            <select className="select" style={{ maxWidth: 240 }} value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">All classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="input" style={{ maxWidth: 160 }} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <button className="btn" type="button" onClick={loadTests}>Refresh</button>
          </div>
          {busy && <Spinner label="Loading tests…" />}
          {!busy && tests.length === 0 ? (
            <EmptyState title="No tests" text="Create a test to see averages, highest, lowest, and pass/fail counts." />
          ) : (
            <div className="table-wrap mobile-cards">
              <table>
                <thead>
                  <tr>
                    <th>Test</th><th>Class</th><th>Subject</th><th>Average</th><th>Highest</th><th>Lowest</th><th>Pass</th><th>Fail</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t) => (
                    <tr key={t.id}>
                      <td data-label="Test"><Link to={`/app/tests/${t.id}`}>{t.name}</Link></td>
                      <td data-label="Class">{t.class?.name}</td>
                      <td data-label="Subject">{t.subject}</td>
                      <td data-label="Average">{t.analytics?.attempted ? t.analytics.average : "—"}</td>
                      <td data-label="Highest">{t.analytics?.attempted ? t.analytics.highest : "—"}</td>
                      <td data-label="Lowest">{t.analytics?.attempted ? t.analytics.lowest : "—"}</td>
                      <td data-label="Pass">{t.analytics?.passCount ?? 0}</td>
                      <td data-label="Fail">{t.analytics?.failCount ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
