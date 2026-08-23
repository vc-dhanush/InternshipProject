import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";

export default function StagePlaceholder({ title, text }) {
  return (
    <div>
      <PageHeader title={title} text={text} />
      <div className="card panel">
        <p className="muted">
          This section is part of the product roadmap. The layout, navigation, and account session are ready;
          the working tools for this page will arrive in a later stage.
        </p>
        <Link className="btn secondary" to="/app/dashboard">Back to dashboard</Link>
      </div>
    </div>
  );
}
