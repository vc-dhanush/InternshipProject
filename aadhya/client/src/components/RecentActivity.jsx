export default function RecentActivity({ items }) {
  return (
    <section className="card panel">
      <h3>Recent activity</h3>
      {items.length === 0 ? (
        <p className="inline-empty-text">No activity yet. Actions you take in Aadhya will appear here.</p>
      ) : (
        <ol className="activity-list">
          {items.map((item, i) => (
            <li key={`${item.type}-${item.at}-${i}`}>
              <span className={`activity-dot ${item.type}`} />
              <div>
                <strong>{item.title}</strong>
                <p className="meta">{item.meta} {item.at ? `· ${new Date(item.at).toLocaleString()}` : ""}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
