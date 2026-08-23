const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const mongoose = require("mongoose");
const { createApp } = require("../index");
const User = require("../models/User");
const CollegeSettings = require("../models/CollegeSettings");

const PASSWORD = "Password1!";
const EMAIL = "stage2.auth@gmail.com";
const STAFF = "ADH-STAGE2";

let mongod;
let server;
let port;
let cookie = "";
let developmentResetUrl = "";

function setCookie(res) {
  const parts = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  if (parts.length) cookie = parts.map((c) => c.split(";")[0]).join("; ");
}

async function request(path, { method = "GET", body, authed = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (authed && cookie) headers.Cookie = cookie;
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  setCookie(res);
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data, headers: res.headers };
}

async function connectMemoryOrLocal() {
  try {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    return true;
  } catch {
    try {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aadhya_auth_test", {
        serverSelectionTimeoutMS: 1500,
      });
      return true;
    } catch {
      return false;
    }
  }
}

describe("auth flow", async () => {
  const ready = await connectMemoryOrLocal();

  before(async () => {
    if (!ready) return;
    await User.deleteMany({ email: EMAIL });
    await CollegeSettings.deleteMany({});
    server = http.createServer(createApp());
    await new Promise((resolve) => server.listen(0, resolve));
    port = server.address().port;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState) {
      await User.deleteMany({ email: EMAIL });
      await mongoose.disconnect();
    }
    if (mongod) await mongod.stop();
  });

  it("skips when MongoDB is unavailable", () => {
    if (!ready) {
      console.log("Skipping auth flow tests: MongoDB is not running and mongodb-memory-server is not installed.");
    }
    assert.equal(true, true);
  });

  it("rejects yahoo signup", async () => {
    if (!ready) return;
    const res = await request("/api/auth/signup", {
      method: "POST",
      body: {
        fullName: "Test Staff",
        email: "abc@yahoo.com",
        staffId: "ADH-Y",
        password: PASSWORD,
        confirmPassword: PASSWORD,
      },
    });
    assert.equal(res.status, 400);
    assert.match(res.data.message, /gmail/i);
  });

  it("rejects weak password", async () => {
    if (!ready) return;
    const res = await request("/api/auth/signup", {
      method: "POST",
      body: {
        fullName: "Test Staff",
        email: EMAIL,
        staffId: STAFF,
        password: "password",
        confirmPassword: "password",
      },
    });
    assert.equal(res.status, 400);
    assert.match(res.data.message, /security requirements/i);
  });

  it("creates an account with hashed password and httpOnly cookie", async () => {
    if (!ready) return;
    const res = await request("/api/auth/signup", {
      method: "POST",
      body: {
        fullName: "Test Staff",
        email: EMAIL,
        staffId: STAFF,
        password: PASSWORD,
        confirmPassword: PASSWORD,
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.user.email, EMAIL);
    assert.equal(res.data.user.staffId, STAFF);
    assert.equal(res.data.user.passwordHash, undefined);
    assert.equal(res.data.token, undefined);
    const setCookie = res.headers.get("set-cookie") || "";
    assert.match(setCookie, /token=/);
    assert.match(setCookie, /HttpOnly/i);
    const stored = await User.findOne({ email: EMAIL }).select("+passwordHash");
    assert.ok(stored.passwordHash.startsWith("$2"));
    assert.equal(stored.password, undefined);
    cookie = "";
  });

  it("rejects the wrong password with a generic message", async () => {
    if (!ready) return;
    const res = await request("/api/auth/login", {
      method: "POST",
      body: { email: EMAIL, password: "WrongPass1!" },
    });
    assert.equal(res.status, 401);
    assert.equal(res.data.message, "Invalid email or password");
  });

  it("logs in with the correct password", async () => {
    if (!ready) return;
    const res = await request("/api/auth/login", {
      method: "POST",
      body: { email: EMAIL, password: PASSWORD },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.needsCollegeSetup, true);
    assert.ok(cookie.includes("token="));
  });

  it("rejects unauthenticated dashboard access", async () => {
    if (!ready) return;
    const res = await request("/api/dashboard");
    assert.equal(res.status, 401);
  });

  it("allows the session after login and keeps it on /auth/me", async () => {
    if (!ready) return;
    const dash = await request("/api/dashboard", { authed: true });
    assert.equal(dash.status, 200);
    const me = await request("/api/auth/me", { authed: true });
    assert.equal(me.status, 200);
    assert.equal(me.data.user.email, EMAIL);
  });

  it("requires college name on first-login setup", async () => {
    if (!ready) return;
    const empty = await request("/api/onboarding", { method: "POST", authed: true, body: { collegeName: "" } });
    assert.equal(empty.status, 400);
    const ok = await request("/api/onboarding", {
      method: "POST",
      authed: true,
      body: { collegeName: "Test College", collegeAddress: "YOUR COLLEGE ADDRESS" },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.user.onboardingComplete, true);
    const dash = await request("/api/dashboard", { authed: true });
    assert.equal(dash.status, 200);
    assert.equal(dash.data.stats.totalClasses, 0);
    assert.equal(dash.data.stats.totalStudents, 0);
    assert.equal(dash.data.hasClasses, false);
    assert.equal(dash.data.hasAttendance, false);
    assert.equal(Array.isArray(dash.data.lowAttendance), true);
    assert.equal(dash.data.stats.overallAttendance, null);
  });

  it("logs out and blocks protected routes", async () => {
    if (!ready) return;
    const out = await request("/api/auth/logout", { method: "POST", authed: true });
    assert.equal(out.status, 200);
    cookie = "";
    const dash = await request("/api/dashboard", { authed: true });
    assert.equal(dash.status, 401);
  });

  it("forgot password reports missing email config in development", async () => {
    if (!ready) return;
    const res = await request("/api/auth/forgot-password", { method: "POST", body: { email: EMAIL } });
    assert.equal(res.status, 200);
    assert.equal(res.data.emailConfigured, false);
    assert.equal(res.data.developmentMode, true);
    assert.match(res.data.message, /not configured/i);
    assert.ok(res.data.developmentResetUrl);
    developmentResetUrl = res.data.developmentResetUrl;
  });

  it("reset password invalidates the old password", async () => {
    if (!ready) return;
    const token = developmentResetUrl.split("/reset-password/")[1];
    const nextPassword = "NewPass1!";
    const reset = await request(`/api/auth/reset-password/${token}`, {
      method: "POST",
      body: { token, password: nextPassword, confirmPassword: nextPassword },
    });
    assert.equal(reset.status, 200);
    const oldLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: EMAIL, password: PASSWORD },
    });
    assert.equal(oldLogin.status, 401);
    const newLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: EMAIL, password: nextPassword },
    });
    assert.equal(newLogin.status, 200);
    const me = await request("/api/auth/me", { authed: true });
    assert.equal(me.status, 200);
  });
});
