import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import { ConfirmDialog, EmptyState, Modal, Spinner } from "../components/ui";
import { Icon, initials } from "../components/Icons";

const emptyStudent = { studentId: "", name: "", email: "", phone: "" };

export default function ClassDetail() {
  const { classId } = useParams();
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("rollNo");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(emptyStudent);
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null);
  const [classEdit, setClassEdit] = useState(false);

  async function loadClass() {
    const { data } = await api.get(`/classes/${classId}`);
    setCls(data.class);
  }

  async function loadStudents(nextQ = q) {
    const { data } = await api.get(`/classes/${classId}/students`, {
      params: { q: nextQ, sort, status, limit: 100 },
    });
    setStudents(data.students);
    setTotal(data.total);
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadClass(), loadStudents()]);
    } catch (err) {
      setError(err.message);
      setCls(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [classId, sort, status]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!cls) return;
      loadStudents(q).catch((err) => setError(err.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function saveStudent(e, isEdit) {
    e.preventDefault();
    const source = isEdit ? edit : form;
    if (!source.name.trim() || !source.studentId.trim()) {
      setError("Student name and student ID are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("studentId", source.studentId);
      fd.append("name", source.name);
      fd.append("rollNo", source.studentId);
      fd.append("email", source.email || "");
      fd.append("phone", source.phone || "");
      fd.append("classId", classId);
      if (photo) fd.append("photo", photo);
      if (isEdit) await api.put(`/students/${source.id}`, fd);
      else await api.post(`/classes/${classId}/students`, fd);
      setAddOpen(false);
      setEdit(null);
      setForm(emptyStudent);
      setPhoto(null);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveClass(e) {
    e.preventDefault();
    if (!cls.name.trim() || !cls.subject.trim()) {
      setError("Class name and subject are required.");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/classes/${classId}`, cls);
      setClassEdit(false);
      await loadClass();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function archiveStudent() {
    setSaving(true);
    try {
      await api.delete(`/students/${pending.id}`);
      setPending(null);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card panel">
        <Spinner label="Loading class…" />
      </div>
    );
  }
  if (!cls) {
    return (
      <div className="card panel error-panel">
        <h3>Unable to open this class.</h3>
        <p className="muted">{error || "It may not exist, or you may not have access."}</p>
        <Link className="btn secondary" to="/app/classes">Back to classes</Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${cls.name}${cls.section ? ` · ${cls.section}` : ""}`}
        text={`${cls.subject} · ${cls.academicYear || "Year not set"} · Semester ${cls.semester || "—"}`}
        actions={
          <div className="row-actions" style={{ marginTop: 0 }}>
            <button className="btn secondary" type="button" onClick={() => setClassEdit(true)}>Edit</button>
            <button className="btn" type="button" onClick={() => { setForm(emptyStudent); setAddOpen(true); }}>
              <Icon name="plus" size={16} /> Add Student
            </button>
            <Link className="btn secondary" to={`/app/import-students?classId=${classId}`}>Import students</Link>
          </div>
        }
      />
      {error && <div className="error">{error}</div>}
      <div className="stat-grid class-stat-row">
        <div className="stat-card"><p className="stat-label">Total students</p><p className="stat-value">{cls.studentCount}</p></div>
        <div className="stat-card"><p className="stat-label">Attendance sessions</p><p className="stat-value">{cls.classesConducted}</p></div>
        <div className="stat-card"><p className="stat-label">Overall attendance</p><p className="stat-value">{cls.attendancePercentage == null ? "No data yet" : `${cls.attendancePercentage}%`}</p></div>
        <div className="stat-card"><p className="stat-label">Tests</p><p className="stat-value">{cls.testCount || 0}</p></div>
      </div>

      <div className="toolbar">
        <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, roll no, student ID…" />
        <select className="select" style={{ maxWidth: 160 }} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="rollNo">Sort: Roll number</option>
          <option value="name">Sort: Name</option>
          <option value="studentId">Sort: Student ID</option>
        </select>
        <select className="select" style={{ maxWidth: 140 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
      </div>

      {students.length === 0 ? (
        <EmptyState
          title="No students added"
          text="Add students to start managing this class."
          action={
            <button className="btn" type="button" onClick={() => setAddOpen(true)}>
              Add Student
            </button>
          }
        />
      ) : (
        <div className="student-list">
          {students.map((st) => (
            <article className="card student-row" key={st.id}>
              {st.profilePicture ? (
                <img className="avatar" src={st.profilePicture} alt="" />
              ) : (
                <div className="avatar">{initials(st.name)}</div>
              )}
              <div>
                <strong>{st.name}</strong>
                {st.archived && <span className="badge muted">Archived</span>}
                <p className="meta">ID {st.studentId}</p>
                <p className="meta">{st.email || "No email"} · {st.phone || "No phone"}</p>
              </div>
              <div className="card-actions">
                <Link className="btn secondary" to={`/app/students/${st.id}`}>View</Link>
                <button className="btn ghost" type="button" onClick={() => { setEdit({ ...st }); setPhoto(null); }}>Edit</button>
                {!st.archived && (
                  <button className="btn ghost" type="button" onClick={() => setPending(st)}>Archive</button>
                )}
              </div>
            </article>
          ))}
          <p className="meta">{total} student{total === 1 ? "" : "s"}</p>
        </div>
      )}

      {classEdit && (
        <Modal title="Edit class" onClose={() => !saving && setClassEdit(false)}>
          <form onSubmit={saveClass} className="form-grid">
            <div className="field span-2"><label>Class name</label><input className="input" required value={cls.name} onChange={(e) => setCls({ ...cls, name: e.target.value })} /></div>
            <div className="field"><label>Section</label><input className="input" value={cls.section || ""} onChange={(e) => setCls({ ...cls, section: e.target.value })} /></div>
            <div className="field"><label>Academic year</label><input className="input" value={cls.academicYear || ""} onChange={(e) => setCls({ ...cls, academicYear: e.target.value })} /></div>
            <div className="field"><label>Semester</label><input className="input" value={cls.semester || ""} onChange={(e) => setCls({ ...cls, semester: e.target.value })} /></div>
            <div className="field"><label>Subject</label><input className="input" required value={cls.subject} onChange={(e) => setCls({ ...cls, subject: e.target.value })} /></div>
            <div className="span-2 row-actions">
              <button className="btn" disabled={saving}>{saving ? <Spinner label="Saving…" /> : "Save"}</button>
            </div>
          </form>
        </Modal>
      )}

      {(addOpen || edit) && (
        <Modal title={edit ? "Edit student" : "Add student"} onClose={() => { if (!saving) { setAddOpen(false); setEdit(null); } }}>
          <form onSubmit={(e) => saveStudent(e, Boolean(edit))} className="form-grid">
            <StudentFields
              value={edit || form}
              onChange={(next) => (edit ? setEdit(next) : setForm(next))}
              onPhoto={setPhoto}
            />
            <div className="span-2 row-actions">
              <button className="btn" disabled={saving}>{saving ? <Spinner label="Saving…" /> : "Save student"}</button>
            </div>
          </form>
        </Modal>
      )}

      {pending && (
        <ConfirmDialog
          title="Archive this student?"
          text={`${pending.name} will be hidden from the active class list. Their record is kept.`}
          confirmLabel="Archive student"
          danger
          busy={saving}
          onClose={() => setPending(null)}
          onConfirm={archiveStudent}
        />
      )}
    </div>
  );
}

function StudentFields({ value, onChange, onPhoto }) {
  function set(k, v) {
    onChange({ ...value, [k]: v });
  }
  return (
    <>
      <div className="field span-2">
        <label htmlFor="st-name">Student name</label>
        <input id="st-name" className="input" required value={value.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="field span-2">
        <label htmlFor="st-id">Student ID</label>
        <input id="st-id" className="input" required value={value.studentId} onChange={(e) => set("studentId", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="st-email">Email</label>
        <input id="st-email" className="input" type="email" value={value.email || ""} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="st-phone">Phone</label>
        <input id="st-phone" className="input" value={value.phone || ""} onChange={(e) => set("phone", e.target.value)} />
      </div>
      <div className="field span-2">
        <label htmlFor="st-photo">Profile picture</label>
        <input id="st-photo" className="input" type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files[0])} />
      </div>
    </>
  );
}
