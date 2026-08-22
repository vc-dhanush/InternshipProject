import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import PageHeader from "../components/PageHeader";
import { AttendanceToggle, ConfirmDialog, EmptyState, Spinner } from "../components/ui";
import { nowTime, todayISO } from "../utils/format";

export default function Attendance() {
  const { settings } = useAuth();
  const [params, setParams] = useSearchParams();
  const classId = params.get("classId") || "";
  const [classes, setClasses] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [marks, setMarks] = useState({});
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowTime());
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data.classes)).catch((err) => setError(err.message));
  }, []);

  async function loadSheet(id) {
    if (!id) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.get("/attendance/sheet", { params: { classId: id } });
      setSheet(data);
      setSubject(data.class.subject || "");
      const next = {};
      data.students.forEach((s) => {
        next[s.id || s._id] = data.defaultStatus || "present";
      });
      setMarks(next);
    } catch (err) {
      setError(err.message);
      setSheet(null);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (classId) loadSheet(classId);
    else {
      setSheet(null);
      setMarks({});
    }
  }, [classId]);

  const students = useMemo(() => {
    const list = sheet?.students || [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((s) => `${s.name} ${s.studentId} ${s.rollNo}`.toLowerCase().includes(needle));
  }, [sheet, q]);

  const present = Object.values(marks).filter((v) => v === "present").length;
  const absent = Object.values(marks).filter((v) => v === "absent").length;
  const total = Object.keys(marks).length;
  const pct = total ? Math.round((present / total) * 1000) / 10 : 0;

  function markAll(status) {
    const next = {};
    (sheet?.students || []).forEach((s) => {
      next[s.id || s._id] = status;
    });
    setMarks(next);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const records = Object.entries(marks).map(([studentId, status]) => ({ studentId, status }));
      await api.post("/attendance/sessions", {
        classId,
        date,
        time,
        subject,
        records,
      });
      setConfirm(false);
      setSuccess("Attendance saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        text="Select a class, mark present or absent, and save the session."
        actions={
          <div className="row-actions" style={{ marginTop: 0 }}>
            <Link className="btn secondary" to="/app/attendance/history">History</Link>
          </div>
        }
      />
      <div className="toolbar">
        <select className="select" style={{ maxWidth: 320 }} value={classId} onChange={(e) => setParams({ classId: e.target.value })}>
          <option value="">Select class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.subject}</option>
          ))}
        </select>
      </div>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      {!classId && (
        <EmptyState title="Choose a class" text="Open the attendance sheet for one of your classes. Student lists load automatically." />
      )}
      {busy && <Spinner label="Loading students…" />}
      {sheet && !busy && (
        <>
          <div className="card attendance-hero">
            <div>
              <div className="college-chip" style={{ marginBottom: 10 }}>
                <img src={settings?.collegeLogo || "/assets/logo-placeholder.svg"} alt="" />
                <span>{settings?.collegeName || "YOUR COLLEGE NAME"}</span>
              </div>
              <h2 style={{ margin: "0 0 6px" }}>{sheet.class.name}</h2>
              <div className="meta">{settings?.appName || "Aadhya : attendance tracker"}</div>
              <div className="toolbar att-meta">
                <label className="field" style={{ margin: 0 }}>
                  <span>Subject</span>
                  <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </label>
                <label className="field" style={{ margin: 0 }}>
                  <span>Date</span>
                  <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
                <label className="field" style={{ margin: 0 }}>
                  <span>Time</span>
                  <input className="input" value={time} onChange={(e) => setTime(e.target.value)} />
                </label>
              </div>
            </div>
            <div className="kpis">
              <div className="kpi"><span className="muted">Total</span><b>{total}</b></div>
              <div className="kpi"><span className="muted">Present</span><b>{present}</b></div>
              <div className="kpi"><span className="muted">Absent</span><b>{absent}</b></div>
              <div className="kpi"><span className="muted">Attendance %</span><b>{pct}%</b></div>
            </div>
          </div>
          {!sheet.students.length ? (
            <EmptyState
              title="No students in this class"
              text="Add students or import a student list before taking attendance."
              action={<Link className="btn" to={`/app/classes/${classId}`}>Open class</Link>}
            />
          ) : (
            <>
              <div className="toolbar att-actions">
                <input className="search" placeholder="Search student ID or name" value={q} onChange={(e) => setQ(e.target.value)} />
                <button className="btn secondary" type="button" onClick={() => markAll("present")}>Mark all present</button>
                <button className="btn secondary" type="button" onClick={() => markAll("absent")}>Mark all absent</button>
                <button className="btn ghost" type="button" onClick={() => loadSheet(classId)}>Reset</button>
                <button className="btn" type="button" onClick={() => setConfirm(true)}>Save attendance</button>
              </div>
              <div className="table-wrap mobile-cards">
                <table>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student name</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const sid = s.id || s._id;
                      return (
                        <tr key={sid}>
                          <td data-label="Student ID">{s.studentId}</td>
                          <td data-label="Name">{s.name}</td>
                          <td data-label="Attendance">
                            <AttendanceToggle value={marks[sid]} onChange={(v) => setMarks({ ...marks, [sid]: v })} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
      {confirm && (
        <ConfirmDialog
          title="Save this attendance session?"
          text={`${present} present, ${absent} absent (${pct}%). This creates a saved session for ${date} ${time}.`}
          confirmLabel="Confirm & save"
          busy={saving}
          onClose={() => setConfirm(false)}
          onConfirm={save}
        />
      )}
    </div>
  );
}
