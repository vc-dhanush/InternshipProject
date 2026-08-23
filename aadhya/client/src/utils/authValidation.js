export function isGmail(email) {
  const value = String(email || "").trim().toLowerCase();
  return /^[^\s@]+@gmail\.com$/.test(value);
}

export function isValidStaffId(staffId) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/.test(String(staffId || "").trim());
}

export function passwordChecklist(password) {
  return [
    { label: "At least 8 characters", ok: (password || "").length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password || "") },
    { label: "One lowercase letter", ok: /[a-z]/.test(password || "") },
    { label: "One number", ok: /[0-9]/.test(password || "") },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(password || "") },
  ];
}

export function isStrongPassword(password) {
  return passwordChecklist(password).every((item) => item.ok);
}
