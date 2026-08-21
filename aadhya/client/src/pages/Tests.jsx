import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { EmptyState, Modal, Spinner } from "../components/ui";
import { todayISO } from "../utils/format";

export default function Tests() {
  const [tests, setTests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ classId: "", q: "", date: "" });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", date: todayISO(), totalMarks: 50, classId: "" });
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function load() {
    const { data } = await api.get("/tests", { params: filters });
    setTests(data.tests);
  }
  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data.classes));
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/tests", form);
      setOpen(false);
      nav(`/app/tests/${data.test.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="toolbar">
        <select className="select" style={{ maxWidth: 220 }} value={filters.classId} onChange={(e) => setFilters({ ...filters, classId: e.target.value })}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="search" placeholder="Search test name" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <input type="date" className="input" style={{ maxWidth: 170 }} value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        <button className="btn secondary" onClick={load}>Filter</button>
        <button className="btn" onClick={() => setOpen(true)}>Create test</button>
      </div>
      {tests.length === 0 ? (
        <EmptyState title="No tests yet" text="Create unlimited tests — Internal Assessment, Model Exam, Quiz, Assignment, and more. Student names are loaded from the class." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Test</th><th>Class</th><th>Subject</th><th>Date</th><th>Total</th></tr></thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} onClick={() => nav(`/app/tests/${t.id}`)} style={{ cursor: "pointer" }}>
                  <td>{t.name}</td>
                  <td>{t.class?.name}</td>
                  <td>{t.subject}</td>
                  <td>{t.date}</td>
                  <td>{t.totalMarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <Modal title="Create test" onClose={() => setOpen(false)}>
          {error && <div className="error">{error}</div>}
          <form onSubmit={create} className="form-grid">
            <div className="field span-2"><label>Test name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Internal Assessment 1" /></div>
            <div className="field"><label>Class</label>
              <select className="select" required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                <option value="">Select</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Subject</label><input className="input" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Machine Learning" /></div>
            <div className="field"><label>Date</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="field"><label>Total marks</label><input type="number" className="input" min="1" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: e.target.value })} /></div>
            <div className="span-2"><button className="btn">Create & enter marks</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function TestDetail() {
  const { id } = useParams();
  const [pack, setPack] = useState(null);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data } = await api.get(`/tests/${id}`);
    setPack(data);
  }
  useEffect(() => { load(); }, [id]);

  if (!pack) return <Spinner label="Loading test…" />;
  const rows = pack.rows.filter((r) => `${r.student.name} ${r.student.rollNo}`.toLowerCase().includes(q.toLowerCase()));

  function setMark(i, value) {
    const next = { ...pack, rows: pack.rows.map((r, idx) => (idx === i ? { ...r, obtainedMarks: value } : r)) };
    setPack(next);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.post(`/tests/${id}/marks`, {
        marks: pack.rows.map((r) => ({ studentId: r.student.id || r.student._id, obtainedMarks: r.obtainedMarks })),
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const a = pack.analytics || {};

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <div className="card page-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{pack.test.name}</h2>
        <p className="muted">{pack.test.subject} • {pack.test.date} • Total {pack.test.totalMarks}</p>
        <div className="kpis">
          <div className="kpi"><span className="muted">Highest</span><b>{a.highest ?? "—"}</b></div>
          <div className="kpi"><span className="muted">Lowest</span><b>{a.lowest ?? "—"}</b></div>
          <div className="kpi"><span className="muted">Average</span><b>{a.average ?? "—"}</b></div>
          <div className="kpi"><span className="muted">Pass</span><b>{a.passCount ?? 0}</b></div>
          <div className="kpi"><span className="muted">Fail</span><b>{a.failCount ?? 0}</b></div>
        </div>
      </div>
      <div className="toolbar">
        <input className="search" placeholder="Search student" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" onClick={save} disabled={saving}>{saving ? <Spinner label="Saving marks…" /> : "Save marks"}</button>
        <button className="btn secondary" onClick={() => downloadMarks(id)}>Export CSV</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Roll No</th><th>Student Name</th><th>Total Marks</th><th>Obtained Marks</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const idx = pack.rows.indexOf(r);
              return (
                <tr key={r.student._id || r.student.id}>
                  <td>{r.student.rollNo}</td>
                  <td><Link to={`/app/students/${r.student._id || r.student.id}`}>{r.student.name}</Link></td>
                  <td>{pack.test.totalMarks}</td>
                  <td>
                    <input
                      className="input"
                      style={{ maxWidth: 120 }}
                      type="number"
                      min="0"
                      max={pack.test.totalMarks}
                      value={r.obtainedMarks}
                      onChange={(e) => setMark(idx, e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function downloadMarks(id) {
  const res = await api.get(`/reports/export/marks.csv?testId=${id}`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "marks.csv";
  a.click();
}
