import { useEffect, useState } from "react";
import api from "../services/api";
import { AttendanceToggle, Spinner } from "../components/ui";
import { nowTime, todayISO } from "../utils/format";

export default function ImportAttendance() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [ocrText, setOcrText] = useState("");
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data.classes));
  }, []);

  useEffect(() => {
    if (!classId) return;
    api.get("/students", { params: { classId, limit: 200 } }).then(({ data }) => setStudents(data.students));
  }, [classId]);

  async function run(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("classId", classId);
      const { data } = await api.post("/ocr/attendance", fd);
      setRows(data.rows);
      setOcrText(data.ocrText);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function setRow(i, patch) {
    const next = [...rows];
    next[i] = { ...next[i], ...patch };
    setRows(next);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const chosen = {};
      students.forEach((s) => {
        chosen[s.id || s._id] = "absent";
      });
      rows.forEach((r) => {
        const sid = r.student?.id;
        if (sid) chosen[sid] = r.mark || "present";
      });
      const records = Object.entries(chosen).map(([studentId, status]) => ({ studentId, status }));
      await api.post("/attendance/sessions", {
        classId,
        date: todayISO(),
        time: nowTime(),
        source: "ocr",
        records,
      });
      alert("Attendance saved after your review.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="card page-card" style={{ marginBottom: 16 }}>
        <h3>Import attendance from image</h3>
        <p className="muted">
          Upload a photo of an attendance sheet. The system extracts student IDs and names, matches them to this
          class, and waits for you to confirm. OCR is never used for test marks.
        </p>
        <form onSubmit={run} className="toolbar">
          <select className="select" required style={{ maxWidth: 260 }} value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input" type="file" accept="image/*" required onChange={(e) => setFile(e.target.files[0])} />
          <button className="btn" disabled={busy}>{busy ? <Spinner label="Processing image…" /> : "Extract"}</button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>
      {rows.length > 0 && (
        <>
          <div className="toolbar">
            <button className="btn" disabled={saving} onClick={save}>{saving ? <Spinner label="Saving…" /> : "Confirm & save attendance"}</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Detected ID</th>
                  <th>Detected name</th>
                  <th>Match</th>
                  <th>Correct student</th>
                  <th>Mark</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.extractedId || "—"}</td>
                    <td>{r.extractedName || r.raw}</td>
                    <td>
                      <span className={`badge ${r.status === "matched" ? "ok" : "warn"}`}>
                        {r.status === "matched" ? "Matched" : "Needs Review"}
                      </span>
                    </td>
                    <td>
                      <select
                        className="select"
                        value={r.student?.id || ""}
                        onChange={(e) => {
                          const st = students.find((s) => String(s.id || s._id) === e.target.value);
                          setRow(i, { student: st ? { id: st.id || st._id, name: st.name } : null, status: st ? "matched" : "needs_review" });
                        }}
                      >
                        <option value="">Unknown</option>
                        {students.map((s) => (
                          <option key={s.id || s._id} value={s.id || s._id}>{s.rollNo} — {s.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <AttendanceToggle value={r.mark || "present"} onChange={(v) => setRow(i, { mark: v })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="card page-card" style={{ marginTop: 16 }}>
            <summary>Raw OCR text</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>{ocrText}</pre>
          </details>
        </>
      )}
    </div>
  );
}
