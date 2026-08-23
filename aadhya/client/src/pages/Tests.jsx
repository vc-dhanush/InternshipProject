import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import { EmptyState, Modal, Spinner } from "../components/ui";
import { todayISO } from "../utils/format";
import { downloadApiFile } from "../utils/download";

export default function Tests() {
  const [tests, setTests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ classId: "", q: "", date: "" });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", date: todayISO(), totalMarks: 50, classId: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  async function load(next = filters) {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (next.classId) params.classId = next.classId;
      if (next.q) params.q = next.q;
      if (next.date) params.date = next.date;
      const { data } = await api.get("/tests", { params });
      setTests(data.tests);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data.classes)).catch((err) => setError(err.message));
    load();
  }, []);

  function onClassChange(classId) {
    const cls = classes.find((c) => c.id === classId);
    setForm({ ...form, classId, subject: cls?.subject || form.subject });
  }

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
      <PageHeader
        title="Tests & marks"
        text="Create unlimited tests. Student names load from the selected class."
        actions={<button className="btn" type="button" onClick={() => setOpen(true)}>Create test</button>}
      />
      {error && !open && <div className="error">{error}</div>}
      <div className="toolbar">
        <select className="select" style={{ maxWidth: 220 }} value={filters.classId} onChange={(e) => setFilters({ ...filters, classId: e.target.value })}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="search" placeholder="Search test name" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <input type="date" className="input" style={{ maxWidth: 170 }} value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        <button className="btn secondary" type="button" onClick={() => load(filters)}>Filter</button>
      </div>
      {loading ? <Spinner label="Loading tests…" /> : tests.length === 0 ? (
        <EmptyState title="No tests yet" text="Create Internal Assessment, Model Exam, Quiz, or any other test. There is no limit on the number of tests." />
      ) : (
        <div className="table-wrap mobile-cards">
          <table>
            <thead><tr><th>Test</th><th>Class</th><th>Subject</th><th>Date</th><th>Total</th></tr></thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} onClick={() => nav(`/app/tests/${t.id}`)} style={{ cursor: "pointer" }}>
                  <td data-label="Test">{t.name}</td>
                  <td data-label="Class">{t.class?.name}</td>
                  <td data-label="Subject">{t.subject}</td>
                  <td data-label="Date">{t.date}</td>
                  <td data-label="Total">{t.totalMarks}</td>
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
              <select className="select" required value={form.classId} onChange={(e) => onClassChange(e.target.value)}>
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
  const [success, setSuccess] = useState("");

  async function load() {
    const { data } = await api.get(`/tests/${id}`);
    setPack(data);
  }
  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  if (error && !pack) {
    return <div className="card panel error-panel"><h3>Unable to open this test.</h3><p className="muted">{error}</p></div>;
  }
  if (!pack) return <Spinner label="Loading test…" />;
  const rows = pack.rows.filter((r) => `${r.student.name} ${r.student.studentId} ${r.student.rollNo}`.toLowerCase().includes(q.toLowerCase()));

  function setMark(i, value) {
    setPack({ ...pack, rows: pack.rows.map((r, idx) => (idx === i ? { ...r, obtainedMarks: value } : r)) });
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post(`/tests/${id}/marks`, {
        marks: pack.rows.map((r) => ({ studentId: r.student.id || r.student._id, obtainedMarks: r.obtainedMarks })),
      });
      await load();
      setSuccess("Marks saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const a = pack.analytics || {};
  const total = pack.test.totalMarks;

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      <div className="card page-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{pack.test.name}</h2>
        <p className="muted">{pack.test.class?.name} · {pack.test.subject} · {pack.test.date} · Total {total}</p>
        <div className="kpis">
          <div className="kpi"><span className="muted">Highest</span><b>{a.attempted ? a.highest : "—"}</b></div>
          <div className="kpi"><span className="muted">Lowest</span><b>{a.attempted ? a.lowest : "—"}</b></div>
          <div className="kpi"><span className="muted">Average</span><b>{a.attempted ? a.average : "—"}</b></div>
          <div className="kpi"><span className="muted">Avg %</span><b>{a.attempted ? `${a.averagePercent}%` : "—"}</b></div>
          <div className="kpi"><span className="muted">Pass</span><b>{a.passCount ?? 0}</b></div>
          <div className="kpi"><span className="muted">Fail</span><b>{a.failCount ?? 0}</b></div>
        </div>
      </div>
      <div className="toolbar">
        <input className="search" placeholder="Search student" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" type="button" onClick={save} disabled={saving}>{saving ? <Spinner label="Saving marks…" /> : "Save marks"}</button>
        <button className="btn secondary" type="button" onClick={() => downloadApiFile(api, `/reports/export/marks.csv?testId=${id}`, "marks.csv")}>Export CSV</button>
      </div>
      <div className="table-wrap mobile-cards">
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Student name</th>
              <th>Total marks</th>
              <th>Obtained marks</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const idx = pack.rows.indexOf(r);
              const obtained = r.obtainedMarks === "" || r.obtainedMarks == null ? "" : Number(r.obtainedMarks);
              const pct = obtained === "" || !Number.isFinite(obtained) ? "—" : `${Math.round((obtained / total) * 1000) / 10}%`;
              return (
                <tr key={r.student._id || r.student.id}>
                  <td data-label="Student ID">{r.student.studentId}</td>
                  <td data-label="Name"><Link to={`/app/students/${r.student._id || r.student.id}`}>{r.student.name}</Link></td>
                  <td data-label="Total">{total}</td>
                  <td data-label="Obtained">
                    <input
                      className="input mark-input"
                      type="number"
                      min="0"
                      max={total}
                      value={r.obtainedMarks}
                      onChange={(e) => setMark(idx, e.target.value)}
                    />
                  </td>
                  <td data-label="%">{pct}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
