export default function About() {
  return (
    <div className="card page-card prose">
      <h2>About Aadhya</h2>
      <p>
        Aadhya is a staff workspace for running classes. It keeps class lists, attendance, tests, and reports in
        one place so daily academic work does not depend on paper registers or disconnected spreadsheets.
      </p>
      <h3>What it covers</h3>
      <ul>
        <li><strong>Class management</strong> — create and maintain the classes you teach, with the students who belong to each one.</li>
        <li><strong>Student management</strong> — add students by name and student ID, or import a photographed list after review.</li>
        <li><strong>Attendance</strong> — open a class sheet, mark present or absent, save a session, and revisit history when a record needs to change.</li>
        <li><strong>Tests and marks</strong> — create as many tests as you need and enter marks against the existing class list.</li>
        <li><strong>Reporting</strong> — read attendance percentages, test summaries, and export CSV when you need to share results.</li>
      </ul>
      <p>
        Each staff account only sees its own classes, students, attendance, tests, and reports. Empty screens mean
        no records have been saved yet — Aadhya does not invent sample data.
      </p>
    </div>
  );
}
