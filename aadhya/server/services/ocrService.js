const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SKIP = new Set(
  "present absent p a roll no number name student id class section sl sno sr".split(" ")
);

function tokenize(text) {
  return String(text || "")
    .replace(/[^\w\s.-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function looksLikeId(token) {
  if (!token) return false;
  if (SKIP.has(token.toLowerCase())) return false;
  return /^(?:[A-Za-z]{0,6}-?)?\d{1,12}$/.test(token) || /[A-Za-z]{1,4}\d{2,12}/.test(token);
}

function extractCandidates(ocrText) {
  const lines = String(ocrText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = [];
  const idLike = /\b([A-Za-z]{0,6}-?\d{1,12})\b/g;

  for (const line of lines) {
    if (line.length < 2) continue;
    const lower = line.toLowerCase();
    if (lower.includes("student name") && lower.includes("id")) continue;
    if (/^(name|roll|student|class|section)\b/i.test(line) && line.split(/\s+/).length <= 4) continue;

    const ids = [...line.matchAll(idLike)].map((m) => m[1]).filter(looksLikeId);
    const words = tokenize(line).filter((w) => !SKIP.has(w.toLowerCase()) && !looksLikeId(w) && /[A-Za-z]/.test(w));
    const nameGuess = words.slice(0, 5).join(" ");
    const studentId = ids.length ? ids[ids.length - 1] : "";

    if (studentId || nameGuess.length >= 3) {
      rows.push({
        studentId,
        name: nameGuess,
        raw: line,
        confidence: studentId && nameGuess.length >= 3 ? "ok" : "needs_review",
      });
    }
  }
  return rows;
}

function matchStudents(extracted, students) {
  return extracted.map((row) => {
    const idN = normalize(row.studentId);
    const nameN = normalize(row.name);
    let match = null;
    let confidence = "needs_review";

    if (idN) {
      match = students.find(
        (st) => normalize(st.studentId) === idN || normalize(st.rollNo) === idN
      );
      if (match) confidence = "matched";
    }
    if (!match && nameN.length >= 3) {
      match = students.find((st) => {
        const n = normalize(st.name);
        return n === nameN || n.includes(nameN) || nameN.includes(n);
      });
      if (match) confidence = "matched";
    }

    return {
      extractedId: row.studentId || "",
      extractedName: row.name || "",
      raw: row.raw,
      student: match
        ? {
            id: match._id,
            name: match.name,
            rollNo: match.rollNo,
            studentId: match.studentId,
          }
        : null,
      status: match ? "matched" : "needs_review",
      confidence,
    };
  });
}

function classifyImportRows(extracted, existing, ocrConfidence) {
  const seen = new Set();
  const overallWeak = ocrConfidence != null && ocrConfidence < 55;
  return extracted.map((row, index) => {
    const studentId = String(row.studentId || "").trim();
    const name = String(row.name || "").trim();
    const idN = normalize(studentId);
    const existingMatch = existing.find(
      (st) => idN && (normalize(st.studentId) === idN || normalize(st.rollNo) === idN)
    );
    const fileDup = Boolean(idN && seen.has(idN));
    if (idN) seen.add(idN);

    const incomplete = !studentId || !name;
    const lineWeak = overallWeak || row.confidence === "needs_review" || incomplete;

    let status = "new";
    if (existingMatch) status = "matched";
    else if (fileDup) status = "duplicate";
    else if (lineWeak) status = "needs_review";

    return {
      key: `${index}-${studentId}-${name}`,
      studentId,
      name,
      raw: row.raw || "",
      status,
      selected: status === "new",
      existingId: existingMatch ? String(existingMatch._id) : null,
    };
  });
}

async function preprocessImage(filePath) {
  const dir = path.dirname(filePath);
  const out = path.join(dir, `prep-${path.basename(filePath)}.png`);
  await sharp(filePath)
    .rotate()
    .resize({ width: 1800, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen()
    .threshold(160)
    .png()
    .toFile(out);
  return out;
}

async function runOcr(filePath) {
  let Tesseract;
  try {
    Tesseract = require("tesseract.js");
  } catch (err) {
    const error = new Error("OCR engine is not available on this server.");
    error.status = 503;
    throw error;
  }

  const prepared = await preprocessImage(filePath);
  const result = await Tesseract.recognize(prepared, "eng", {
    tessedit_char_whitelist:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .-_",
  });
  try {
    fs.unlinkSync(prepared);
  } catch {
    /* ignore */
  }
  return {
    text: result.data?.text || "",
    confidence: result.data?.confidence ?? null,
  };
}

module.exports = {
  extractCandidates,
  matchStudents,
  classifyImportRows,
  runOcr,
  preprocessImage,
};
