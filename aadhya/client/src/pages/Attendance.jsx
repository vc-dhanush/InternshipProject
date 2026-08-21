import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { AttendanceToggle, Modal, Spinner } from "../components/ui";
import { nowTime, todayISO } from "../utils/format";

export default function Attendance() {
  const { settings } = useAuth();
  const [params, setParams] = useSearchParams();
  const classId = params.get("classId") || "";
  const [classes, setClasses] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [marks, setMarks] = useState({});
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowTime());
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data.classes));
  }, []);

  async function loadSheet(id) {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.get("/attendance/sheet", { params: { classId: id } });
      setSheet(data);
      const next = {};
      data.students.forEach((s) => {
        next[s.id || s._id] = data.defaultStatus || "present";
      });
      setMarks(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (classId) loadSheet(classId);
  }, [classId]);

  const students = useMemo(() => {
    const list = sheet?.students || [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((s) => `${s.name} ${s.rollNo} ${s.studentId}`.toLowerCase().includes(needle));
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
        subject: sheet.class.subject,
        records,
      });
      setConfirm(false);
      setError("");
      alert("Attendance saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="toolbar">
        <select className="select" style={{ maxWidth: 320 }} value={classId} onChange={(e) => setParams({ classId: e.target.value })}>
          <option value="">Select class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.subject}</option>
          ))}
        </select>
        <Link className="btn secondary" to="/app/history">History</Link>
        <Link className="btn secondary" to="/app/import">Import from image</Link>
      </div>
      {error && <div className="error">{error}</div>}
      {!classId && <p className="muted">Choose a class to open the attendance sheet.</p>}
      {busy && <Spinner label="Loading students…" />}
      {sheet && (
        <>
          <div className="card attendance-hero">
            <div>
              <div className="college-chip" style={{ marginBottom: 10 }}>
                <img src={settings?.collegeLogo || "/assets/logo-placeholder.svg"} alt="YOUR LOGO" />
                <span>{settings?.collegeName || "YOUR COLLEGE NAME"}</span>
              </div>
              <h2 style={{ margin: "0 0 6px" }}>{sheet.class.name}</h2>
              <div className="meta">
                {settings?.appName || "Aadhya : attendance tracker"} • {sheet.class.subject}
              </div>
              <div className="toolbar">
                <input type="date" className="input" style={{ maxWidth: 180 }} value={date} onChange={(e) => setDate(e.target.value)} />
                <input className="input" style={{ maxWidth: 140 }} value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div className="kpis">
              <div className="kpi"><span className="muted">Total</span><b>{total}</b></div>
              <div className="kpi"><span className="muted">Present</span><b>{present}</b></div>
              <div className="kpi"><span className="muted">Absent</span><b>{absent}</b></div>
              <div className="kpi"><span className="muted">Attendance</span><b>{pct}%</b></div>
            </div>
          </div>
          <div className="toolbar">
            <input className="search" placeholder="Search Rahul…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn secondary" onClick={() => markAll("present")}>Mark all Present</button>
            <button className="btn secondary" onClick={() => markAll("absent")}>Mark all Absent</button>
            <button className="btn ghost" onClick={() => loadSheet(classId)}>Reset</button>
            <button className="btn" onClick={() => setConfirm(true)}>Save attendance</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const sid = s.id || s._id;
                  return (
                    <tr key={sid}>
                      <td>{i + 1}</td>
                      <td>{s.rollNo}</td>
                      <td>{s.name}</td>
                      <td>
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
      {confirm && (
        <Modal title="Confirm attendance" onClose={() => setConfirm(false)}>
          <p><strong>{present} Present</strong></p>
          <p><strong>{absent} Absent</strong></p>
          <div className="row-actions">
            <button className="btn secondary" onClick={() => setConfirm(false)}>Back</button>
            <button className="btn" disabled={saving} onClick={save}>{saving ? <Spinner label="Saving…" /> : "Confirm & save"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
