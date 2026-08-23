import { useState } from "react";

export function Spinner({ label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span className="spinner" />
      {label ? <span className="muted">{label}</span> : null}
    </span>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="empty card">
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="modal-back" onClick={onClose || undefined}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn ghost" onClick={onClose} type="button" disabled={!onClose}>
            Close
          </button>
        </div>
        <div style={{ marginTop: 14 }}>{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, text, confirmLabel = "Confirm", danger, busy, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={busy ? undefined : onClose}>
      <p>{text}</p>
      <div className="row-actions">
        <button className="btn secondary" type="button" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button className={`btn ${danger ? "danger" : ""}`} type="button" disabled={busy} onClick={onConfirm}>
          {busy ? <Spinner label="Working…" /> : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function PasswordField({ value, onChange, placeholder = "Password", autoComplete = "new-password" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input
        className="input"
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button type="button" onClick={() => setShow((s) => !s)}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export function AttendanceToggle({ value, onChange }) {
  return (
    <div className="toggle">
      <button type="button" className={value === "present" ? "on present" : ""} onClick={() => onChange("present")}>
        Present
      </button>
      <button type="button" className={value === "absent" ? "on absent" : ""} onClick={() => onChange("absent")}>
        Absent
      </button>
    </div>
  );
}
