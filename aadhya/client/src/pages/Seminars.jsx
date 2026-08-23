import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import { ConfirmDialog, EmptyState, Modal, Spinner } from "../components/ui";
import { todayISO } from "../utils/format";

const emptyForm = {
  title: "",
  subject: "",
  classId: "",
  description: "",
  date: todayISO(),
  time: "",
  venue: "",
  maxMarks: "",
};

export default function Seminars() {
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null);
  const nav = useNavigate();

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (classId) params.classId = classId;
      const { data } = await api.get("/seminars", { params });
      setItems(data.seminars);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data.classes)).catch((err) => setError(err.message));
  }, []);
  useEffect(() => { load(); }, [classId]);

  function onClassChange(id) {
    const cls = classes.find((c) => c.id === id);
    setForm({ ...form, classId: id, subject: cls?.subject || form.subject });
  }

  async function create(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/seminars", form);
      setOpen(false);
      nav(`/app/seminars/${data.seminar.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function archive() {
    try {
      await api.delete(`/seminars/${pending.id}`);
      setPending(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Seminars"
        text="Track seminar topics and optionally record participation or marks."
        actions={<button className="btn" type="button" onClick={() => { setForm(emptyForm); setOpen(true); }}>+ Create seminar</button>}
      />
      {error && !open && <div className="error">{error}</div>}
      <div className="toolbar">
        <select className="select" style={{ maxWidth: 240 }} value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {loading ? <Spinner label="Loading seminars…" /> : items.length === 0 ? (
        <EmptyState title="No seminars yet" text="Create a seminar to record the topic, date, and venue. Evaluation is optional." />
      ) : (
        <div className="table-wrap mobile-cards">
          <table>
            <thead>
              <tr>
                <th>Topic</th><th>Class</th><th>Subject</th><th>Date</th><th>Time</th><th>Venue</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td data-label="Topic">{s.title}</td>
                  <td data-label="Class">{s.class?.name}</td>
                  <td data-label="Subject">{s.subject}</td>
                  <td data-label="Date">{s.date}</td>
                  <td data-label="Time">{s.time || "—"}</td>
                  <td data-label="Venue">{s.venue || "—"}</td>
                  <td data-label="Status"><span className="badge">{s.status}</span></td>
                  <td>
                    <div className="row-actions" style={{ marginTop: 0 }}>
                      <Link className="btn secondary" to={`/app/seminars/${s.id}`}>View</Link>
                      <button className="btn ghost" type="button" onClick={() => nav(`/app/seminars/${s.id}`)}>Edit</button>
                      <button className="btn ghost" type="button" onClick={() => setPending(s)}>Archive</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <Modal title="Create seminar" onClose={() => setOpen(false)}>
          {error && <div className="error">{error}</div>}
          <form onSubmit={create} className="form-grid">
            <div className="field span-2"><label>Seminar topic</label><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="field"><label>Class</label>
              <select className="select" required value={form.classId} onChange={(e) => onClassChange(e.target.value)}>
                <option value="">Select</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Subject</label><input className="input" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div className="field span-2"><label>Description</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="field"><label>Date</label><input type="date" className="input" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="field"><label>Time</label><input className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="11:00" /></div>
            <div className="field"><label>Venue</label><input className="input" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
            <div className="field"><label>Maximum marks (optional)</label><input type="number" min="0" className="input" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} /></div>
            <div className="span-2"><button className="btn">Create seminar</button></div>
          </form>
        </Modal>
      )}
      {pending && (
        <ConfirmDialog
          title="Archive this seminar?"
          text={`${pending.title} will be hidden from the list.`}
          confirmLabel="Archive"
          danger
          onClose={() => setPending(null)}
          onConfirm={archive}
        />
      )}
    </div>
  );
}

export function SeminarDetail() {
  const { id } = useParams();
  const [pack, setPack] = useState(null);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const { data } = await api.get(`/seminars/${id}`);
    setPack(data);
  }
  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  if (error && !pack) return <div className="card panel error-panel"><h3>Unable to open this seminar.</h3><p className="muted">{error}</p></div>;
  if (!pack) return <Spinner label="Loading seminar…" />;

  const rows = pack.rows.filter((r) => `${r.student.name} ${r.student.studentId}`.toLowerCase().includes(q.toLowerCase()));
  const max = pack.seminar.maxMarks;

  function patch(i, next) {
    setPack({ ...pack, rows: pack.rows.map((r, idx) => (idx === i ? { ...r, ...next } : r)) });
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post(`/seminars/${id}/records`, {
        records: pack.rows.map((r) => ({
          studentId: r.student.id,
          participation: r.participation,
          obtainedMarks: r.obtainedMarks,
          remarks: r.remarks,
        })),
      });
      await load();
      setSuccess("Seminar records saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      <div className="card page-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{pack.seminar.title}</h2>
        <p className="muted">
          {pack.seminar.class?.name} · {pack.seminar.subject} · {pack.seminar.date} {pack.seminar.time} · {pack.seminar.venue || "Venue not set"} · {pack.seminar.status}
        </p>
        {pack.seminar.description && <p>{pack.seminar.description}</p>}
      </div>
      <div className="toolbar">
        <input className="search" placeholder="Search student" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" type="button" disabled={saving} onClick={save}>{saving ? <Spinner label="Saving…" /> : "Save records"}</button>
      </div>
      <div className="table-wrap mobile-cards">
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Student name</th>
              <th>Participation</th>
              {max ? <th>Obtained marks</th> : null}
              {max ? <th>%</th> : null}
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const idx = pack.rows.indexOf(r);
              const obtained = r.obtainedMarks === "" || r.obtainedMarks == null ? "" : Number(r.obtainedMarks);
              const pct = !max || obtained === "" ? "—" : `${Math.round((obtained / max) * 1000) / 10}%`;
              return (
                <tr key={r.student.id}>
                  <td data-label="Student ID">{r.student.studentId}</td>
                  <td data-label="Name"><Link to={`/app/students/${r.student.id}`}>{r.student.name}</Link></td>
                  <td data-label="Participation">
                    <select className="select" value={r.participation} onChange={(e) => patch(idx, { participation: e.target.value })}>
                      <option value="">—</option>
                      <option value="yes">Yes</option>
                      <option value="partial">Partial</option>
                      <option value="no">No</option>
                    </select>
                  </td>
                  {max ? (
                    <td data-label="Marks">
                      <input className="input mark-input" type="number" min="0" max={max} value={r.obtainedMarks} onChange={(e) => patch(idx, { obtainedMarks: e.target.value })} />
                    </td>
                  ) : null}
                  {max ? <td data-label="%">{pct}</td> : null}
                  <td data-label="Remarks">
                    <input className="input" value={r.remarks} onChange={(e) => patch(idx, { remarks: e.target.value })} />
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
