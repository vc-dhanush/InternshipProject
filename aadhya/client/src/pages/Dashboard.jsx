import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import StatCard, { StatSkeleton } from "../components/StatCard";
import ClassSummary from "../components/ClassSummary";
import AttendanceOverview from "../components/AttendanceOverview";
import LowAttendanceList from "../components/LowAttendanceList";
import RecentActivity from "../components/RecentActivity";
import QuickActions from "../components/QuickActions";
import { EmptyState } from "../components/ui";
import { Icon } from "../components/Icons";

function greeting(name) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name || "there"}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data: payload } = await api.get("/dashboard");
      setData(payload);
    } catch (err) {
      setError(err.message || "Unable to load dashboard data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div aria-busy="true" aria-live="polite">
        <div className="page-header">
          <div>
            <div className="skel skel-line" style={{ width: 220 }} />
            <div className="skel skel-line" style={{ width: 320, marginTop: 10 }} />
          </div>
        </div>
        <div className="stat-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card panel error-panel">
        <h3>Unable to load dashboard data.</h3>
        <p className="muted">Please try again.</p>
        <button className="btn" type="button" onClick={load}>
          <Icon name="retry" size={16} /> Retry
        </button>
      </div>
    );
  }

  const s = data.stats;
  const empty = !data.hasClasses;

  return (
    <div>
      <PageHeader
        title={greeting(user?.fullName)}
        text="Here’s an overview of your academic activity."
      />

      <div className="stat-grid">
        <StatCard label="Total classes" value={s.totalClasses} hint="Classes you currently manage" icon="classes" tone="accent" />
        <StatCard label="Total students" value={s.totalStudents} hint="Across all of your classes" icon="students" tone="teal" />
        <StatCard
          label="Classes conducted"
          value={s.totalClassesConducted}
          hint="Saved attendance sessions"
          icon="attendance"
          tone="accent"
        />
        <StatCard
          label="Overall attendance"
          value={s.overallAttendance == null ? "No data yet" : `${s.overallAttendance}%`}
          hint={s.overallAttendance == null ? "No sessions recorded" : `${s.presentTotal} present · ${s.absentTotal} absent`}
          icon="percent"
          tone="ok"
        />
        <StatCard label="Total tests" value={s.totalTests} hint="Assessments you have created" icon="tests" tone="warn" />
        <StatCard
          label="Average marks"
          value={s.averageMarks == null ? "No data yet" : `${s.averageMarks}%`}
          hint={s.averageMarks == null ? "No marks entered" : "Mean score across saved marks"}
          icon="marks"
          tone="teal"
        />
      </div>

      {empty ? (
        <EmptyState
          title="Your dashboard is ready."
          text="Create your first class to start managing students and attendance."
          action={
            <Link className="btn" to="/app/classes">
              Create class
            </Link>
          }
        />
      ) : (
        <>
          <div className="dash-grid">
            <AttendanceOverview
              hasAttendance={data.hasAttendance}
              trend={data.trend}
              presentTotal={s.presentTotal}
              absentTotal={s.absentTotal}
            />
            <div className="dash-stack">
              <LowAttendanceList students={data.lowAttendance} threshold={data.threshold} />
              <QuickActions />
            </div>
          </div>
          <ClassSummary classes={data.classes} />
          <RecentActivity items={data.activity} />
        </>
      )}

      {empty ? <QuickActions /> : null}
    </div>
  );
}
