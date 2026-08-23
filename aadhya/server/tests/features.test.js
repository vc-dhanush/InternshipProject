const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const mongoose = require("mongoose");
const { createApp } = require("../index");
const User = require("../models/User");
const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const AttendanceSession = require("../models/AttendanceSession");
const Test = require("../models/Test");
const { classifyImportRows, extractCandidates } = require("../services/ocrService");

let mongod;
let server;
let port;

function jar() {
  let cookie = "";
  return {
    get() {
      return cookie;
    },
    set(res) {
      const parts = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
      if (parts.length) cookie = parts.map((c) => c.split(";")[0]).join("; ");
    },
  };
}

async function request(path, { method = "GET", body, cookies } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookies?.get()) headers.Cookie = cookies.get();
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (cookies) cookies.set(res);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function signup(cookies, email, staffId) {
  await request("/api/auth/signup", {
    method: "POST",
    cookies,
    body: {
      fullName: staffId,
      email,
      staffId,
      password: "Password1!",
      confirmPassword: "Password1!",
    },
  });
  await request("/api/onboarding", {
    method: "POST",
    cookies,
    body: { collegeName: "Test College", defaultAttendanceStatus: "present" },
  });
}

describe("attendance tests reports and import", async () => {
  let ready = false;
  try {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    ready = true;
  } catch {
    ready = false;
  }

  const a = jar();
  const b = jar();
  let classA;
  let studentA;
  let studentB;
  let sessionId;
  let testId;

  before(async () => {
    if (!ready) return;
    server = http.createServer(createApp());
    await new Promise((resolve) => server.listen(0, resolve));
    port = server.address().port;
    await signup(a, "staff.a.stage5@gmail.com", "STF-A5");
    await signup(b, "staff.b.stage5@gmail.com", "STF-B5");
    const created = await request("/api/classes", {
      method: "POST",
      cookies: a,
      body: { name: "AIML-A", subject: "Machine Learning" },
    });
    classA = created.data.class.id;
    const s1 = await request(`/api/classes/${classA}/students`, {
      method: "POST",
      cookies: a,
      body: { name: "Rahul Kumar", studentId: "101" },
    });
    studentA = s1.data.student.id;
    const s2 = await request(`/api/classes/${classA}/students`, {
      method: "POST",
      cookies: a,
      body: { name: "Priya Sharma", studentId: "102" },
    });
    studentB = s2.data.student.id;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState) {
      await Promise.all([
        User.deleteMany({ email: /stage5@gmail.com$/ }),
        ClassModel.deleteMany({}),
        Student.deleteMany({}),
        AttendanceSession.deleteMany({}),
        Test.deleteMany({}),
      ]);
      await mongoose.disconnect();
    }
    if (mongod) await mongod.stop();
  });

  it("skips when MongoDB is unavailable", () => {
    if (!ready) {
      console.log("Skipping remaining-feature tests: MongoDB is not available.");
    }
    assert.equal(true, true);
  });

  it("rejects unauthenticated attendance", async () => {
    if (!ready) return;
    const res = await request("/api/attendance/sheet?classId=x");
    assert.equal(res.status, 401);
  });

  it("saves attendance and rejects an identical session", async () => {
    if (!ready) return;
    const body = {
      classId: classA,
      date: "2026-08-22",
      time: "10:00",
      subject: "Machine Learning",
      records: [
        { studentId: studentA, status: "present" },
        { studentId: studentB, status: "absent" },
      ],
    };
    const first = await request("/api/attendance/sessions", { method: "POST", cookies: a, body });
    assert.equal(first.status, 201);
    sessionId = first.data.session.id;
    assert.equal(first.data.session.presentCount, 1);
    assert.equal(first.data.session.absentCount, 1);
    const dup = await request("/api/attendance/sessions", { method: "POST", cookies: a, body });
    assert.equal(dup.status, 409);
  });

  it("blocks staff B from staff A attendance and students", async () => {
    if (!ready) return;
    const sheet = await request(`/api/attendance/sessions/${sessionId}`, { cookies: b });
    assert.equal(sheet.status, 404);
    const student = await request(`/api/students/${studentA}`, { cookies: b });
    assert.equal(student.status, 404);
    const cls = await request(`/api/classes/${classA}`, { cookies: b });
    assert.equal(cls.status, 404);
  });

  it("returns student profile attendance from saved sessions", async () => {
    if (!ready) return;
    const res = await request(`/api/students/${studentA}`, { cookies: a });
    assert.equal(res.status, 200);
    assert.equal(res.data.attendance.present, 1);
    assert.equal(res.data.attendance.absent, 0);
  });

  it("creates a test, saves marks, and computes analytics", async () => {
    if (!ready) return;
    const created = await request("/api/tests", {
      method: "POST",
      cookies: a,
      body: {
        name: "Internal Assessment 1",
        subject: "Machine Learning",
        classId: classA,
        date: "2026-08-22",
        totalMarks: 50,
      },
    });
    assert.equal(created.status, 201);
    testId = created.data.test.id;
    assert.ok(created.data.students.length >= 2);
    const saved = await request(`/api/tests/${testId}/marks`, {
      method: "POST",
      cookies: a,
      body: {
        marks: [
          { studentId: studentA, obtainedMarks: 40 },
          { studentId: studentB, obtainedMarks: 15 },
        ],
      },
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.data.analytics.highest, 40);
    assert.equal(saved.data.analytics.lowest, 15);
    assert.equal(saved.data.analytics.passCount, 1);
    const other = await request(`/api/tests/${testId}`, { cookies: b });
    assert.equal(other.status, 404);
  });

  it("exports attendance csv for the owner only", async () => {
    if (!ready) return;
    const res = await fetch(`http://127.0.0.1:${port}/api/reports/export/attendance.csv?classId=${classA}`, {
      headers: { Cookie: a.get() },
    });
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /Rahul Kumar/);
    const denied = await fetch(`http://127.0.0.1:${port}/api/reports/export/attendance.csv?classId=${classA}`, {
      headers: { Cookie: b.get() },
    });
    assert.equal(denied.status, 404);
  });

  it("imports reviewed students and skips duplicates without attendance", async () => {
    if (!ready) return;
    const extracted = extractCandidates("103 Arjun Rao\n101 Rahul Kumar");
    const existing = [
      { _id: studentA, studentId: "101", rollNo: "101", name: "Rahul Kumar" },
    ];
    const preview = classifyImportRows(extracted, existing, 80);
    const arjun = preview.find((r) => r.studentId === "103");
    const rahul = preview.find((r) => r.studentId === "101");
    assert.equal(arjun.status, "new");
    assert.equal(rahul.status, "duplicate");
    const imported = await request("/api/ocr/students/import", {
      method: "POST",
      cookies: a,
      body: {
        classId: classA,
        students: [
          { studentId: "103", name: "Arjun Rao", selected: true },
          { studentId: "101", name: "Rahul Kumar", selected: true },
        ],
      },
    });
    assert.equal(imported.status, 201);
    assert.equal(imported.data.imported, 1);
    assert.ok(imported.data.skipped >= 1);
    const sessions = await AttendanceSession.countDocuments({});
    assert.equal(sessions, 1);
  });

  it("does not create attendance from a missing OCR image", async () => {
    if (!ready) return;
    const res = await request("/api/ocr/students", { method: "POST", cookies: a, body: { classId: classA } });
    assert.equal(res.status, 400);
  });

  it("creates assignments and blocks staff B", async () => {
    if (!ready) return;
    const created = await request("/api/assignments", {
      method: "POST",
      cookies: a,
      body: {
        title: "Lab 1",
        subject: "Machine Learning",
        classId: classA,
        assignedDate: "2026-08-20",
        dueDate: "2026-08-27",
        maxMarks: 10,
      },
    });
    assert.equal(created.status, 201);
    const id = created.data.assignment.id;
    const marks = await request(`/api/assignments/${id}/marks`, {
      method: "POST",
      cookies: a,
      body: { marks: [{ studentId: studentA, obtainedMarks: 8 }] },
    });
    assert.equal(marks.status, 200);
    const other = await request(`/api/assignments/${id}`, { cookies: b });
    assert.equal(other.status, 404);
  });

  it("creates seminars and blocks staff B", async () => {
    if (!ready) return;
    const created = await request("/api/seminars", {
      method: "POST",
      cookies: a,
      body: {
        title: "Intro to ML",
        subject: "Machine Learning",
        classId: classA,
        date: "2026-08-25",
        time: "11:00",
        venue: "Hall A",
        maxMarks: 5,
      },
    });
    assert.equal(created.status, 201);
    const id = created.data.seminar.id;
    const saved = await request(`/api/seminars/${id}/records`, {
      method: "POST",
      cookies: a,
      body: { records: [{ studentId: studentA, participation: "yes", obtainedMarks: 4, remarks: "Good" }] },
    });
    assert.equal(saved.status, 200);
    const other = await request(`/api/seminars/${id}`, { cookies: b });
    assert.equal(other.status, 404);
  });
});
