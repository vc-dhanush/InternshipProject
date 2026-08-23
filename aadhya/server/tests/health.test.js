const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const { createApp } = require("../index");

describe("health", () => {
  it("returns ok from /api/health", async () => {
    const app = createApp();
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    await new Promise((resolve) => server.close(resolve));
  });

  it("rejects unauthenticated dashboard", async () => {
    const app = createApp();
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/dashboard`);
    assert.equal(res.status, 401);
    await new Promise((resolve) => server.close(resolve));
  });
});
