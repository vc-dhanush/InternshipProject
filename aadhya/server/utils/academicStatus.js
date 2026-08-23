function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function assignmentStatus(assignment, today = todayISO()) {
  if (assignment.completed) return "Completed";
  const due = String(assignment.dueDate || "");
  const assigned = String(assignment.assignedDate || "");
  if (due && due === today) return "Due Today";
  if (due && due < today) return "Overdue";
  if (assigned && assigned > today) return "Upcoming";
  return "Active";
}

function seminarStatus(seminar, today = todayISO()) {
  const date = String(seminar.date || "");
  if (!date) return "Upcoming";
  if (date === today) return "Today";
  if (date < today) return "Completed";
  return "Upcoming";
}

function markAnalytics(scores, maxMarks) {
  const numeric = scores.filter((s) => Number.isFinite(s));
  const highest = numeric.length ? Math.max(...numeric) : null;
  const lowest = numeric.length ? Math.min(...numeric) : null;
  const average = numeric.length
    ? Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 10) / 10
    : null;
  const averagePercent =
    average == null || !maxMarks ? null : Math.round((average / maxMarks) * 1000) / 10;
  return {
    highest,
    lowest,
    average,
    averagePercent,
    evaluated: numeric.length,
  };
}

module.exports = { todayISO, assignmentStatus, seminarStatus, markAnalytics };
