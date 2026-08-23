export default function LowAttendanceList({ students, threshold }) {
  return (
    <section className="card panel">
      <h3>Students requiring attention</h3>
      <p className="meta">Below the {threshold}% attendance threshold set in Settings.</p>
      {students.length === 0 ? (
        <p className="inline-empty-text">All students are above the attendance threshold.</p>
      ) : (
        <ul className="attention-list">
          {students.map((st) => (
            <li key={st.id}>
              <span>
                <strong>{st.name}</strong>
                <span className="meta"> {st.className}{st.rollNo ? ` · ${st.rollNo}` : ""}</span>
              </span>
              <span className="badge warn">{st.percentage}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
