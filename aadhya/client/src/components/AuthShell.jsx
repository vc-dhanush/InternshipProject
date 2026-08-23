import { Link } from "react-router-dom";

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-art">
        <div>
          <img src="/assets/logo-placeholder.svg" alt="YOUR LOGO" width="48" height="48" style={{ borderRadius: 12 }} />
          <p className="muted" style={{ marginTop: 24 }}>Aadhya : attendance tracker</p>
          <h2>Attendance and academic records, kept with the same care as the classroom.</h2>
          <p>Sign in to manage classes, attendance, and marks from a single staff workspace.</p>
        </div>
        <p className="muted">Developed by DHANUSH V C and DINESH DURGAPPA</p>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-brand-row">
            <img src="/assets/logo-placeholder.svg" alt="YOUR LOGO" width="36" height="36" style={{ borderRadius: 10 }} />
            <div>
              <strong>Aadhya : attendance tracker</strong>
              <div className="muted" style={{ fontSize: 12 }}>YOUR COLLEGE NAME</div>
            </div>
          </div>
          <h2 style={{ marginTop: 18 }}>{title}</h2>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthLinks({ extra }) {
  return (
    <p className="auth-foot">
      <Link to="/auth">Login</Link>
      <Link to="/signup">Sign up</Link>
      <Link to="/forgot-password">Forgot password</Link>
      {extra}
    </p>
  );
}
