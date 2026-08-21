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

export { passwordChecklist, isGmail, isStrongPassword } from "./authValidation";
