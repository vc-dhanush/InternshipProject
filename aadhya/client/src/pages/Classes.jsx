import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { EmptyState, Modal, Spinner } from "../components/ui";

const empty = { name: "", section: "", academicYear: "", semester: "", subject: "" };

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function load() {
    setBusy(true);
    try {
      const { data } = await api.get("/classes", { params: { q } });
      setClasses(data.classes);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/classes", form);
      setModal(false);
      setForm(empty);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="toolbar">
        <input className="search" placeholder="Search AIML, class name…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn secondary" onClick={load}>Search</button>
        <button className="btn" onClick={() => setModal(true)}>Create class</button>
      </div>
      {error && <div className="error">{error}</div>}
      {busy ? (
        <Spinner label="Loading classes…" />
      ) : classes.length === 0 ? (
        <EmptyState title="No classes" text="Create a class such as B.E AIML — 6th Semester." />
      ) : (
        <div className="class-grid">
          {classes.map((c) => (
            <div className="card class-card" key={c.id} onClick={() => nav(`/app/classes/${c.id}`)}>
              <h3>{c.name}</h3>
              <div className="meta">{c.subject} • {c.semester || "Semester"} • {c.academicYear}</div>
              <p>{c.studentCount} students • Attendance {c.attendancePercentage}%</p>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title="Create class" onClose={() => setModal(false)}>
          <form onSubmit={create} className="form-grid">
            <div className="field span-2">
              <label>Class name</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="B.E AIML - 6th Semester" />
            </div>
            <div className="field">
              <label>Section</label>
              <input className="input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
            </div>
            <div className="field">
              <label>Academic year</label>
              <input className="input" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2025-26" />
            </div>
            <div className="field">
              <label>Semester</label>
              <input className="input" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            </div>
            <div className="field">
              <label>Subject</label>
              <input className="input" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Machine Learning" />
            </div>
            <div className="span-2 row-actions">
              <button className="btn" type="submit">Save class</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
