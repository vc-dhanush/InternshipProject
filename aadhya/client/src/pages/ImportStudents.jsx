import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import { EmptyState, Spinner } from "../components/ui";

const STATUS_LABEL = {
  new: "New",
  matched: "Matched",
  duplicate: "Duplicate",
  needs_review: "Needs Review",
};

export default function ImportStudents() {
  const [params] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(params.get("classId") || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rows, setRows] = useState([]);
  const [ocrText, setOcrText] = useState("");
  const [drag, setDrag] = useState(false);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data.classes)).catch((err) => setError(err.message));
  }, []);

  function setImage(next) {
    setError("");
    if (next) {
      const okType = /image\/(jpeg|jpg|png)/i.test(next.type) || /\.(jpe?g|png)$/i.test(next.name || "");
      if (!okType) {
        setError("Please upload a JPG, JPEG, or PNG image.");
        return;
      }
      if (next.size > 8 * 1024 * 1024) {
        setError("Image is too large. Use a file under 8 MB.");
        return;
      }
    }
    setFile(next || null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(next ? URL.createObjectURL(next) : "");
  }

  async function extract(e) {
    e?.preventDefault();
    if (!classId || !file) {
      setError("Select a class and upload a student-list image.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    setWarning("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("classId", classId);
      const { data } = await api.post("/ocr/students", fd);
      setRows(data.rows || []);
      setOcrText(data.ocrText || "");
      if (data.needsReview) setWarning(data.message || "We couldn't reliably read some rows. Please review the highlighted entries.");
      if (!(data.rows || []).length) {
        setError("No student information could be detected. Try a clearer image or add students manually.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function patch(i, next) {
    const copy = [...rows];
    copy[i] = { ...copy[i], ...next };
    setRows(copy);
  }

  async function importSelected() {
    const selected = rows.filter((r) => r.selected);
    if (!selected.length) {
      setError("Select at least one row to import.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post("/ocr/students/import", { classId, students: rows });
      setSuccess(`Imported ${data.imported} student${data.imported === 1 ? "" : "s"}. Skipped ${data.skipped}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Import students"
        text="Upload a photo of a student list. Extracted names and IDs are never saved until you review and import them. This does not mark attendance."
      />
      {error && <div className="error">{error}</div>}
      {warning && <div className="error">{warning}</div>}
      {success && <div className="success">{success}</div>}
      <form className="card page-card" onSubmit={extract}>
        <label className="field">
          Class
          <select className="select" required value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.subject}</option>)}
          </select>
        </label>
        <div
          className={`dropzone ${drag ? "on" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const next = e.dataTransfer.files?.[0];
            if (next) setImage(next);
          }}
        >
          <p><strong>Upload student list</strong></p>
          <p className="muted">JPG, JPEG, or PNG. Drag and drop, pick a file, or use the camera on a phone.</p>
          <input
            className="input"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/*"
            capture="environment"
            onChange={(e) => setImage(e.target.files[0])}
          />
        </div>
        {preview && <img src={preview} alt="Selected student list" className="import-preview" />}
        <button className="btn" disabled={busy} type="submit">{busy ? <Spinner label="Processing image…" /> : "Extract students"}</button>
      </form>

      {rows.length > 0 && (
        <>
          <div className="toolbar">
            <button className="btn" type="button" disabled={saving} onClick={importSelected}>
              {saving ? <Spinner label="Importing…" /> : "Import selected students"}
            </button>
          </div>
          <div className="table-wrap mobile-cards">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Student ID</th>
                  <th>Student name</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key || i}>
                    <td data-label="Import">
                      <input type="checkbox" checked={Boolean(r.selected)} onChange={(e) => patch(i, { selected: e.target.checked })} />
                    </td>
                    <td data-label="Student ID">
                      <input className="input" value={r.studentId} onChange={(e) => patch(i, { studentId: e.target.value })} />
                    </td>
                    <td data-label="Name">
                      <input className="input" value={r.name} onChange={(e) => patch(i, { name: e.target.value })} />
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${r.status === "new" ? "ok" : r.status === "needs_review" ? "warn" : "muted"}`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn ghost" type="button" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="card page-card" style={{ marginTop: 16 }}>
            <summary>Detected text</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>{ocrText}</pre>
          </details>
        </>
      )}
      {!rows.length && !busy && (
        <EmptyState title="No extracted rows yet" text="Upload a list such as “01 Rahul Kumar” and review every row before importing." />
      )}
    </div>
  );
}
