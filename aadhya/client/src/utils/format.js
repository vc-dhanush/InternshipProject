export function fileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return path;
}

export function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const PASSWORD_RULES = [
  "At least 8 characters",
  "One uppercase letter",
  "One lowercase letter",
  "One number",
  "One special character",
];

export function passwordChecklist(password) {
  return [
    { label: "At least 8 characters", ok: (password || "").length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password || "") },
    { label: "One lowercase letter", ok: /[a-z]/.test(password || "") },
    { label: "One number", ok: /[0-9]/.test(password || "") },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(password || "") },
  ];
}
