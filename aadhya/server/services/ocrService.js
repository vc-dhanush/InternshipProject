const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

function tokenize(text) {
  return String(text || "")
    .replace(/[^\w\s.-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function extractCandidates(ocrText) {
  const lines = String(ocrText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = [];
  const idLike = /\b([A-Za-z]{0,4}\d{2,12})\b/g;

  for (const line of lines) {
    const ids = [...line.matchAll(idLike)].map((m) => m[1]);
    const words = tokenize(line).filter((w) => !/^\d+$/.test(w) && w.length > 1);
    const nameGuess = words.filter((w) => /[A-Za-z]/.test(w)).slice(0, 4).join(" ");
    if (ids.length) {
      rows.push({
        studentId: ids[ids.length - 1],
        name: nameGuess,
        raw: line,
      });
    } else if (nameGuess.length >= 3) {
      rows.push({
        studentId: "",
        name: nameGuess,
        raw: line,
      });
    }
  }
  return rows;
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
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

async function preprocessImage(filePath) {
  const dir = path.dirname(filePath);
  const out = path.join(dir, `prep-${path.basename(filePath)}.png`);
  await sharp(filePath)
    .rotate()
    .resize({ width: 1800, withoutEnlargement: true })
    .grayscale()
    .normalize()
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
  const result = await Tesseract.recognize(prepared, "eng", {
    tessedit_char_whitelist:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .-_",
  });
  try {
    fs.unlinkSync(prepared);
  } catch {
    /* ignore */
  }
  return result.data?.text || "";
}

module.exports = { extractCandidates, matchStudents, runOcr, preprocessImage };
