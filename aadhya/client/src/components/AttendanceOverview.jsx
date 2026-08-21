import { Doughnut, Line } from "react-chartjs-2";
import "../utils/charts";

export default function AttendanceOverview({ hasAttendance, trend, presentTotal, absentTotal }) {
  return (
    <section className="card panel">
      <h3>Attendance overview</h3>
      {!hasAttendance ? (
        <div className="inline-empty">
          <p>No attendance data yet.</p>
          <p className="muted">Start taking attendance to see your class performance here.</p>
        </div>
      ) : (
        <div className="overview-split">
          <div>
            <Line
              data={{
                labels: trend.map((t) => t.date),
                datasets: [
                  {
                    label: "Attendance %",
                    data: trend.map((t) => t.percentage),
                    borderColor: "rgb(79, 70, 229)",
                    backgroundColor: "rgba(79, 70, 229, 0.12)",
                    fill: true,
                    tension: 0.3,
                    pointRadius: trend.length > 12 ? 0 : 3,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { suggestedMin: 0, suggestedMax: 100, ticks: { color: "#64748b" } }, x: { ticks: { color: "#64748b", maxRotation: 0 } } },
              }}
            />
          </div>
          <div className="doughnut-wrap">
            <Doughnut
              data={{
                labels: ["Present", "Absent"],
                datasets: [
                  {
                    data: [presentTotal, absentTotal],
                    backgroundColor: ["#059669", "#dc2626"],
                    borderWidth: 0,
                  },
                ],
              }}
              options={{ plugins: { legend: { position: "bottom" } }, cutout: "62%" }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
