import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import { ConfirmDialog, EmptyState, Modal, Spinner } from "../components/ui";
import { Icon } from "../components/Icons";
import { StatSkeleton } from "../components/StatCard";

const emptyForm = { name: "", section: "", academicYear: "", semester: "", subject: "" };

export default function Classes() {
  const [params, setParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(params.get("new") === "1");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null);

  async function load(nextQ = q, nextStatus = status) {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/classes", { params: { q: nextQ, status: nextStatus } });
      setClasses(data.classes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  useEffect(() => {
    const t = setTimeout(() => load(q, status), 250);
    return () => clearTimeout(t);
  }, [q]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
    params.delete("new");
    setParams(params, { replace: true });
  }

  useEffect(() => {
    if (params.get("new") === "1") openCreate();
  }, []);

  function openEdit(cls) {
    setEditing(cls);
    setForm({
      name: cls.name,
      section: cls.section || "",
      academicYear: cls.academicYear || "",
      semester: cls.semester || "",
      subject: cls.subject || "",
    });
    setFormOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim()) {
      setError("Class name and subject are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editing) await api.put(`/classes/${editing.id}`, form);
      else await api.post("/classes", form);
      setFormOpen(false);
      setForm(emptyForm);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmArchive() {
    setSaving(true);
    try {
      await api.delete(`/classes/${pending.id}`);
      setPending(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const subtitle = useMemo(() => "Manage your classes, subjects and students.", []);

  return (
    <div>
      <PageHeader
        title="Classes"
        text={subtitle}
        actions={
          <button className="btn" type="button" onClick={openCreate}>
            <Icon name="plus" size={16} /> Create Class
          </button>
        }
      />
      <div className="toolbar">
        <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search class, subject, AIML…" />
        <select className="select" style={{ maxWidth: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
      </div>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="class-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          text="Create your first class to start managing students."
          action={
            <button className="btn" type="button" onClick={openCreate}>
              Create Class
            </button>
          }
        />
      ) : (
        <div className="class-grid">
          {classes.map((cls) => (
            <article className="card class-manage-card" key={cls.id}>
              {cls.archived && <span className="badge muted">Archived</span>}
              <h3>{cls.name}{cls.section ? ` · ${cls.section}` : ""}</h3>
              <p className="meta">{cls.subject}</p>
              <p className="meta">
                {cls.academicYear || "Year not set"} · Semester {cls.semester || "—"}
              </p>
              <div className="class-summary-metrics">
                <span>{cls.studentCount} students</span>
                <span>{cls.classesConducted} sessions</span>
                <span className="metric-strong">
                  {cls.attendancePercentage == null ? "No attendance yet" : `${cls.attendancePercentage}% attendance`}
                </span>
              </div>
              <div className="card-actions">
                <Link className="btn secondary" to={`/app/classes/${cls.id}`}>Open</Link>
                <Link className="btn secondary" to={`/app/classes/${cls.id}`}>Manage Students</Link>
                <button className="btn ghost" type="button" onClick={() => openEdit(cls)}>Edit</button>
                {!cls.archived && (
                  <button className="btn ghost" type="button" onClick={() => setPending(cls)}>Archive</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {formOpen && (
        <Modal title={editing ? "Edit class" : "Create class"} onClose={() => !saving && setFormOpen(false)}>
          <form onSubmit={save} className="form-grid">
            <div className="field span-2">
              <label htmlFor="class-name">Class name</label>
              <input id="class-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="B.E AIML" />
            </div>
            <div className="field">
              <label htmlFor="class-section">Section</label>
              <input id="class-section" className="input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A" />
            </div>
            <div className="field">
              <label htmlFor="class-year">Academic year</label>
              <input id="class-year" className="input" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2026-27" />
            </div>
            <div className="field">
              <label htmlFor="class-sem">Semester</label>
              <input id="class-sem" className="input" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} placeholder="7" />
            </div>
            <div className="field">
              <label htmlFor="class-subject">Subject</label>
              <input id="class-subject" className="input" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Machine Learning" />
            </div>
            <div className="span-2 row-actions">
              <button className="btn secondary" type="button" disabled={saving} onClick={() => setFormOpen(false)}>Cancel</button>
              <button className="btn" disabled={saving}>{saving ? <Spinner label="Saving…" /> : "Save class"}</button>
            </div>
          </form>
        </Modal>
      )}

      {pending && (
        <ConfirmDialog
          title="Archive this class?"
          text={`${pending.name} will be hidden from your active list. Students in this class will be archived. Attendance and test history will not be deleted.`}
          confirmLabel="Archive class"
          danger
          busy={saving}
          onClose={() => setPending(null)}
          onConfirm={confirmArchive}
        />
      )}
    </div>
  );
}
