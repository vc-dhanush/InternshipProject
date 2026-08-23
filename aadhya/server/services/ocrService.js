const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const HEADER = /^(roll|s(?:l|r|no)|student\s*id|name|student\s*name|class|section|id)\b/i;
const SKIP_WORDS = new Set(
  "present absent p a roll no number name student id class section sl sno sr of the and".split(" ")
);

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function splitColumns(line) {
  const trimmed = String(line || "").replace(/\s+/g, " ").trim();
  if (!trimmed) return [];
  const byTab = trimmed.split(/\t+/).map((c) => c.trim()).filter(Boolean);
  if (byTab.length >= 2) return byTab;
  const byMulti = trimmed.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (byMulti.length >= 2) return byMulti;
  return trimmed.split(" ").filter(Boolean);
}

function isSerial(token) {
  return /^\d{1,2}$/.test(token);
}

function isStudentId(token) {
  if (!token) return false;
  const t = String(token).replace(/[|]/g, "").trim();
  if (SKIP_WORDS.has(t.toLowerCase())) return false;
  if (/^\d{2}[A-Za-z]{2,10}\d{2,8}$/i.test(t)) return true;
  if (/^[A-Za-z]{1,10}\d{2,10}$/i.test(t)) return true;
  if (/^[A-Za-z]\d{2,8}$/i.test(t)) return true;
  if (/^\d{3,12}$/.test(t)) return true;
  if (/^[A-Za-z]{0,6}-?\d{2,12}$/.test(t) && t.length >= 3) return true;
  return false;
}

function isNamePart(token) {
  if (!token) return false;
  if (SKIP_WORDS.has(token.toLowerCase())) return false;
  if (isStudentId(token) && /[0-9]/.test(token) && /[A-Za-z]/.test(token) && token.length >= 5) return false;
  if (isSerial(token)) return false;
  return /^[A-Za-z][A-Za-z.'-]{1,}$/.test(token);
}

function isHeaderLine(line) {
  const lower = line.toLowerCase();
  if (HEADER.test(lower) && (lower.includes("name") || lower.includes("id") || lower.includes("roll"))) {
    return lower.split(" ").length <= 8;
  }
  return false;
}

function parseLine(line) {
  const raw = String(line || "").trim();
  if (raw.length < 3) return null;
  if (isHeaderLine(raw)) return null;

  const cols = splitColumns(raw);
  let tokens = cols.length >= 2 ? cols.flatMap((c) => (c.includes(" ") && cols.length < 3 ? c.split(" ") : [c])) : raw.split(/\s+/);

  tokens = tokens.map((t) => t.replace(/[|,;]+/g, "")).filter(Boolean);
  if (!tokens.length) return null;

  let serial = "";
  if (isSerial(tokens[0]) && tokens.slice(1).some(isStudentId)) {
    serial = tokens[0];
    tokens = tokens.slice(1);
  }

  const idTokens = tokens.filter(isStudentId);
  let studentId = "";
  if (idTokens.length) {
    studentId = idTokens.find((t) => /[A-Za-z]/.test(t)) || idTokens[idTokens.length - 1];
  }

  const rest = tokens.filter((t) => t !== studentId && t !== serial && !SKIP_WORDS.has(t.toLowerCase()));
  const name = rest
    .join(" ")
    .split(/\s+/)
    .filter((t) => isNamePart(t))
    .slice(0, 6)
    .join(" ");

  if (!studentId && !name) return null;
  const confidence = studentId && name.split(" ").length >= 1 && name.length >= 3 ? "ok" : "needs_review";
  return { studentId, name, raw, serial, confidence };
}

function extractCandidates(ocrText) {
  const lines = String(ocrText || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = [];
  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed && (parsed.studentId || parsed.name.length >= 3)) rows.push(parsed);
  }
  return rows;
}

function matchStudents(extracted, students) {
  return extracted.map((row) => {
    const idN = normalize(row.studentId);
    const nameN = normalize(row.name);
    let match = null;
    if (idN) {
      match = students.find((st) => normalize(st.studentId) === idN || normalize(st.rollNo) === idN);
    }
    if (!match && nameN.length >= 3) {
      match = students.find((st) => {
        const n = normalize(st.name);
        return n === nameN || n.includes(nameN) || nameN.includes(n);
      });
    }
    return {
      extractedId: row.studentId || "",
      extractedName: row.name || "",
      raw: row.raw,
      student: match
        ? { id: match._id, name: match.name, rollNo: match.rollNo, studentId: match.studentId }
        : null,
      status: match ? "matched" : "needs_review",
      confidence: match ? "matched" : row.confidence || "needs_review",
    };
  });
}

function classifyImportRows(extracted, existing, ocrConfidence) {
  const seen = new Set();
  const overallWeak = ocrConfidence != null && ocrConfidence < 50;
  return extracted.map((row, index) => {
    const studentId = String(row.studentId || "").trim();
    const name = String(row.name || "").trim();
    const idN = normalize(studentId);
    const existingMatch = existing.find(
      (st) => idN && (normalize(st.studentId) === idN || normalize(st.rollNo) === idN)
    );
    const fileDup = Boolean(idN && seen.has(idN));
    if (idN) seen.add(idN);

    const incomplete = !studentId || name.length < 3;
    let status = "new";
    if (existingMatch || fileDup) status = "duplicate";
    else if (overallWeak || row.confidence === "needs_review" || incomplete) status = "needs_review";

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
    .resize({ width: 2000, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .linear(1.25, -20)
    .sharpen()
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
  const worker = await Tesseract.createWorker("eng");
  let result;
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: "6",
    });
    result = await worker.recognize(prepared);
  } finally {
    await worker.terminate();
    try {
      fs.unlinkSync(prepared);
    } catch {
      /* ignore */
    }
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
  parseLine,
  runOcr,
  preprocessImage,
};
