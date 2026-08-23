const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isGmail } = require("../utils/validators");
const { isStrongPassword, getPasswordIssues } = require("../utils/password");
const { extractCandidates, matchStudents } = require("../services/ocrService");
const { toCsv } = require("../utils/csv");
const { percent } = require("../services/statsService");

describe("validators", () => {
  it("accepts gmail addresses only", () => {
    assert.equal(isGmail("staff@gmail.com"), true);
    assert.equal(isGmail("staff@GMAIL.COM"), true);
    assert.equal(isGmail(""), false);
    assert.equal(isGmail("staff@yahoo.com"), false);
    assert.equal(isGmail("not-an-email"), false);
  });

  it("validates staff IDs", () => {
    const { isValidStaffId } = require("../utils/validators");
    assert.equal(isValidStaffId("ADH-1042"), true);
    assert.equal(isValidStaffId("ab"), false);
    assert.equal(isValidStaffId(""), false);
  });

  it("enforces password rules", () => {
    assert.equal(isStrongPassword("Short1!"), false);
    assert.equal(isStrongPassword("password1!"), false);
    assert.equal(isStrongPassword("PASSWORD1!"), false);
    assert.equal(isStrongPassword("Password!!!!"), false);
    assert.equal(isStrongPassword("Password1"), false);
    assert.equal(isStrongPassword("Password1!"), true);
    assert.ok(getPasswordIssues("abc").length >= 3);
  });
});

describe("ocr matching", () => {
  it("extracts ids and matches students", () => {
    const text = "1 101 Rahul Sharma Present\n2 102 Priya Nair\nunknown line";
    const extracted = extractCandidates(text);
    assert.ok(extracted.length >= 2);
    const students = [
      { _id: "a", studentId: "101", rollNo: "01", name: "Rahul Sharma" },
      { _id: "b", studentId: "102", rollNo: "02", name: "Priya Nair" },
    ];
    const rows = matchStudents(extracted, students);
    const matched = rows.filter((r) => r.status === "matched");
    assert.ok(matched.length >= 2);
  });

  it("parses mixed student-list layouts", () => {
    const text = [
      "01    22AIML001    Rahul Kumar",
      "02    22AIML002    Priya Sharma",
      "Roll No     Student ID      Student Name",
      "1           AIML001         Rahul Kumar",
      "Student ID    Name",
      "A001          Rahul Kumar",
      "A002          Priya Sharma",
    ].join("\n");
    const rows = extractCandidates(text);
    const ids = rows.map((r) => r.studentId);
    assert.ok(ids.includes("22AIML001"));
    assert.ok(ids.includes("AIML001"));
    assert.ok(ids.includes("A001"));
    assert.equal(rows.find((r) => r.studentId === "22AIML001").name, "Rahul Kumar");
    assert.equal(rows.find((r) => r.studentId === "A002").name, "Priya Sharma");
  });
});

describe("csv and stats", () => {
  it("escapes csv fields", () => {
    const csv = toCsv(["name", "note"], [{ name: "Ada", note: "said \"hi\", ok" }]);
    assert.match(csv, /"said ""hi"", ok"/);
  });
  it("computes percentage", () => {
    assert.equal(percent(43, 50), 86);
    assert.equal(percent(0, 0), 0);
  });
});
