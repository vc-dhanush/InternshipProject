#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const required = [
  "screen-welcome", "screen-class", "screen-students", "screen-dash",
  "btn-start", "custom-class", "stu-name", "stu-reg",
  "mark-date", "mark-list", "kid-chart", "csv-file",
  "ams_attendance_v2", "MAX_CLASSES = 10", "RETENTION_DAYS = 186",
  "record_type", "register_number"
];
const missing = required.filter((s) => !html.includes(s));
if (missing.length) {
  console.error("Missing required pieces:", missing.join(", "));
  process.exit(1);
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    const cols = [];
    let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { cols.push(cur); cur = ""; }
      else cur += ch;
    }
    cols.push(cur);
    rows.push(cols);
  }
  return rows;
}
const csv = [
  ["record_type", "class_name", "register_number", "student_name", "date", "status", "created_at"],
  ["class", 'Mech, "A"', "", "", "", "", "2026-01-01"],
  ["student", 'Mech, "A"', "21ME01", "Ada Lovelace", "", "enrolled", ""],
  ["absence", 'Mech, "A"', "21ME01", "Ada Lovelace", "2026-08-21", "absent", ""]
].map((r) => r.map(csvEscape).join(",")).join("\n");
const rows = parseCsv(csv);
if (rows[1][1] !== 'Mech, "A"' || rows[2][2] !== "21ME01") {
  console.error("CSV round-trip failed", rows);
  process.exit(1);
}
console.log("attendance checks passed");
