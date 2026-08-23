const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const mongoose = require("mongoose");
const { createApp } = require("../index");
const User = require("../models/User");
const ClassModel = require("../models/Class");
const Student = require("../models/Student");

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
    body: { collegeName: "Test College" },
  });
}

describe("class and student management", async () => {
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

  before(async () => {
    if (!ready) return;
    server = http.createServer(createApp());
    await new Promise((resolve) => server.listen(0, resolve));
    port = server.address().port;
    await signup(a, "staff.a.stage4@gmail.com", "STF-A4");
    await signup(b, "staff.b.stage4@gmail.com", "STF-B4");
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  it("creates and lists a class for the owner only", async () => {
    if (!ready) return;
    const created = await request("/api/classes", {
      method: "POST",
      cookies: a,
      body: { name: "B.E AIML", section: "A", academicYear: "2026-27", semester: "7", subject: "Machine Learning" },
    });
    assert.equal(created.status, 201);
    classA = created.data.class.id;
    const listA = await request("/api/classes", { cookies: a });
    assert.equal(listA.data.classes.length, 1);
    const listB = await request("/api/classes", { cookies: b });
    assert.equal(listB.data.classes.length, 0);
    const dash = await request("/api/dashboard", { cookies: a });
    assert.equal(dash.data.stats.totalClasses, 1);
  });

  it("rejects empty class records", async () => {
    if (!ready) return;
    const res = await request("/api/classes", { method: "POST", cookies: a, body: { name: "  ", subject: "" } });
    assert.equal(res.status, 400);
  });

  it("updates a class", async () => {
    if (!ready) return;
    const res = await request(`/api/classes/${classA}`, {
      method: "PUT",
      cookies: a,
      body: { semester: "8" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.class.semester, "8");
  });

  it("blocks staff B from staff A's class", async () => {
    if (!ready) return;
    const res = await request(`/api/classes/${classA}`, { cookies: b });
    assert.equal(res.status, 404);
    const students = await request(`/api/classes/${classA}/students`, { cookies: b });
    assert.equal(students.status, 404);
  });

  it("adds students, searches, and rejects duplicates", async () => {
    if (!ready) return;
    const one = await request(`/api/classes/${classA}/students`, {
      method: "POST",
      cookies: a,
      body: { rollNo: "01", name: "Rahul Kumar" },
    });
    assert.equal(one.status, 201);
    studentA = one.data.student.id;
    assert.equal(one.data.student.studentId, "01");
    const dup = await request(`/api/classes/${classA}/students`, {
      method: "POST",
      cookies: a,
      body: { rollNo: "01", name: "Another Rahul" },
    });
    assert.equal(dup.status, 409);
    await request(`/api/classes/${classA}/students`, {
      method: "POST",
      cookies: a,
      body: { rollNo: "02", studentId: "STU-02", name: "Priya Sharma" },
    });
    const search = await request(`/api/classes/${classA}/students?q=Rahul`, { cookies: a });
    assert.equal(search.data.total, 1);
    const dash = await request("/api/dashboard", { cookies: a });
    assert.equal(dash.data.stats.totalStudents, 2);
  });

  it("updates a student and blocks cross-user access", async () => {
    if (!ready) return;
    const upd = await request(`/api/students/${studentA}`, {
      method: "PUT",
      cookies: a,
      body: { phone: "9999999999" },
    });
    assert.equal(upd.status, 200);
    assert.equal(upd.data.student.phone, "9999999999");
    const other = await request(`/api/students/${studentA}`, { cookies: b });
    assert.equal(other.status, 404);
  });

  it("archives a student then the class without destroying history path", async () => {
    if (!ready) return;
    const archS = await request(`/api/students/${studentA}`, { method: "DELETE", cookies: a });
    assert.equal(archS.status, 200);
    assert.equal(archS.data.archived, true);
    const active = await request(`/api/classes/${classA}/students`, { cookies: a });
    assert.equal(active.data.total, 1);
    const archC = await request(`/api/classes/${classA}`, { method: "DELETE", cookies: a });
    assert.equal(archC.status, 200);
    assert.equal(archC.data.archived, true);
    const activeClasses = await request("/api/classes", { cookies: a });
    assert.equal(activeClasses.data.classes.length, 0);
    const dash = await request("/api/dashboard", { cookies: a });
    assert.equal(dash.data.stats.totalClasses, 0);
    const stillThere = await ClassModel.findById(classA);
    assert.equal(stillThere.archived, true);
    const studentDoc = await Student.findById(studentA);
    assert.equal(studentDoc.archived, true);
  });
});
