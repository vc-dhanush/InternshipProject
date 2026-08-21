import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, Line } from "react-chartjs-2";
import api from "../services/api";
import { EmptyState, Spinner } from "../components/ui";
import "../utils/charts";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState([]);
  const [error, setError] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [{ data: dash }, { data: ov }] = await Promise.all([
          api.get("/dashboard"),
          api.get("/reports/overview"),
        ]);
        if (live) {
          setData(dash);
          setTrend(ov.trend || []);
        }
      } catch (err) {
        if (live) setError(err.message);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <Spinner label="Loading dashboard…" />;

  const s = data.stats;
  const cards = [
    ["Total classes", s.totalClasses, "▤"],
    ["Total students", s.totalStudents, "☺"],
    ["Classes conducted", s.totalClassesConducted, "✓"],
    ["Overall attendance", `${s.overallAttendance}%`, "%"],
    ["Total tests", s.totalTests, "✎"],
    ["Average marks", `${s.averageMarks}%`, "★"],
  ];

  return (
    <div>
      <div className="grid-stats">
        {cards.map(([k, v, i]) => (
          <div className="card stat" key={k}>
            <div className="i">{i}</div>
            <div className="k">{k}</div>
            <div className="v">{v}</div>
          </div>
        ))}
      </div>

      <div className="chart-grid">
        <div className="card page-card">
          <h3 style={{ marginTop: 0 }}>Attendance trend</h3>
          {trend.length ? (
            <Line
              data={{
                labels: trend.map((t) => t.date),
                datasets: [{ label: "Attendance %", data: trend.map((t) => t.percentage), borderColor: "#4f46e5", tension: 0.3 }],
              }}
              options={{ plugins: { legend: { display: false } }, scales: { y: { suggestedMin: 0, suggestedMax: 100 } } }}
            />
          ) : (
            <p className="muted">Take attendance to see trends.</p>
          )}
        </div>
        <div className="card page-card">
          <h3 style={{ marginTop: 0 }}>Class-wise attendance</h3>
          {data.classes.length ? (
            <Bar
              data={{
                labels: data.classes.map((c) => c.name),
                datasets: [{ label: "%", data: data.classes.map((c) => c.attendancePercentage), backgroundColor: "#14b8a6" }],
              }}
              options={{ plugins: { legend: { display: false } }, scales: { y: { suggestedMin: 0, suggestedMax: 100 } } }}
            />
          ) : (
            <p className="muted">Create a class to start.</p>
          )}
        </div>
      </div>

      <h3 style={{ marginTop: 24 }}>Class overview</h3>
      {data.classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          text="Create your first class to add students and take attendance."
          action={<button className="btn" onClick={() => nav("/app/classes")}>Go to Classes</button>}
        />
      ) : (
        <div className="class-grid">
          {data.classes.map((c) => (
            <div className="card class-card" key={c.id} onClick={() => nav(`/app/classes/${c.id}`)}>
              <h3>{c.name}</h3>
              <div className="meta">{c.subject} {c.section ? `• ${c.section}` : ""}</div>
              <p className="meta">{c.studentCount} students • {c.totalClasses} sessions</p>
              <p>
                Present {c.totalPresent} · Absent {c.totalAbsent} ·{" "}
                <strong>{c.attendancePercentage}%</strong>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
