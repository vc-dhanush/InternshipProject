import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { EmptyState, Modal, Spinner } from "../components/ui";

export default function ClassDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [edit, setEdit] = useState(null);
  const [add, setAdd] = useState(false);
  const [form, setForm] = useState({ rollNo: "", studentId: "", name: "", email: "", phone: "" });

  async function load() {
    try {
      const [{ data: c }, { data: s }] = await Promise.all([
        api.get(`/classes/${id}`),
        api.get("/students", { params: { classId: id, q, limit: 100 } }),
      ]);
      setCls(c.class);
      setStudents(s.students);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function saveStudent(e) {
    e.preventDefault();
    try {
      await api.post("/students", { ...form, classId: id });
      setAdd(false);
      setForm({ rollNo: "", studentId: "", name: "", email: "", phone: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    try {
      await api.put(`/students/${edit.id}`, edit);
      setEdit(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeStudent(st) {
    if (!confirm(`Remove ${st.name}?`)) return;
    await api.delete(`/students/${st.id}`);
    load();
  }

  async function removeClass() {
    if (!confirm("Delete this class and all related records?")) return;
    await api.delete(`/classes/${id}`);
    nav("/app/classes");
  }

  async function saveClass(e) {
    e.preventDefault();
    await api.put(`/classes/${id}`, cls);
    load();
  }

  if (!cls && !error) return <Spinner label="Loading class…" />;
  if (!cls) return <div className="error">{error}</div>;

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <div className="card page-card" style={{ marginBottom: 16 }}>
        <form onSubmit={saveClass} className="form-grid">
          <div className="field"><label>Class name</label><input className="input" value={cls.name} onChange={(e) => setCls({ ...cls, name: e.target.value })} /></div>
          <div className="field"><label>Subject</label><input className="input" value={cls.subject} onChange={(e) => setCls({ ...cls, subject: e.target.value })} /></div>
          <div className="field"><label>Section</label><input className="input" value={cls.section || ""} onChange={(e) => setCls({ ...cls, section: e.target.value })} /></div>
          <div className="field"><label>Semester</label><input className="input" value={cls.semester || ""} onChange={(e) => setCls({ ...cls, semester: e.target.value })} /></div>
          <div className="field"><label>Academic year</label><input className="input" value={cls.academicYear || ""} onChange={(e) => setCls({ ...cls, academicYear: e.target.value })} /></div>
          <div className="field"><label>Created</label><input className="input" disabled value={new Date(cls.createdAt).toLocaleDateString()} /></div>
          <div className="span-2 row-actions">
            <button className="btn" type="submit">Save class</button>
            <button className="btn secondary" type="button" onClick={() => nav(`/app/attendance?classId=${id}`)}>Take attendance</button>
            <button className="btn danger" type="button" onClick={removeClass}>Delete class</button>
          </div>
        </form>
      </div>
      <div className="toolbar">
        <input className="search" placeholder="Search student…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn secondary" onClick={load}>Filter</button>
        <button className="btn" onClick={() => setAdd(true)}>Add student</button>
      </div>
      {students.length === 0 ? (
        <EmptyState title="No students" text="Add students to this class. Roll number and student ID must be unique here." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Student ID</th>
                <th>Name</th>
                <th>Email</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map((st) => (
                <tr key={st.id}>
                  <td>{st.rollNo}</td>
                  <td>{st.studentId}</td>
                  <td>
                    <button className="btn ghost" onClick={() => nav(`/app/students/${st.id}`)}>{st.name}</button>
                  </td>
                  <td>{st.email || "—"}</td>
                  <td>
                    <button className="btn secondary" onClick={() => setEdit({ ...st, id: st.id || st._id })}>Edit</button>{" "}
                    <button className="btn ghost" onClick={() => removeStudent(st)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {add && (
        <Modal title="Add student" onClose={() => setAdd(false)}>
          <form onSubmit={saveStudent} className="form-grid">
            {["rollNo", "studentId", "name", "email", "phone"].map((k) => (
              <div className="field" key={k}>
                <label>{k}</label>
                <input className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required={["rollNo", "studentId", "name"].includes(k)} />
              </div>
            ))}
            <div className="span-2"><button className="btn">Save student</button></div>
          </form>
        </Modal>
      )}
      {edit && (
        <Modal title="Edit student" onClose={() => setEdit(null)}>
          <form onSubmit={saveEdit} className="form-grid">
            {["rollNo", "studentId", "name", "email", "phone"].map((k) => (
              <div className="field" key={k}>
                <label>{k}</label>
                <input className="input" value={edit[k] || ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
              </div>
            ))}
            <div className="span-2"><button className="btn">Update</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
