const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { setSessionCookies, parseCookies } = require("../middleware/sessionCookies");
const { requestSecurity } = require("../middleware/requestSecurity");
const verifyToken = require("../middleware/auth");
const checkRole = require("../middleware/role");
const pool = require("../db");
const credentialVersion = require("../services/credentialVersion");

function responseStub() {
  const headers = {};
  return { headers, getHeader: (name) => headers[name], setHeader: (name, value) => { headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test("session cookies are HttpOnly, host scoped, and expire with the seven day JWT", () => {
  const res = responseStub();
  const csrfToken = setSessionCookies(res, "signed.jwt.value");
  const cookies = res.headers["Set-Cookie"];
  assert.equal(cookies.length, 2);
  assert.match(cookies[0], /^auth_token=signed\.jwt\.value;/);
  assert.match(cookies[0], /HttpOnly/);
  assert.match(cookies[0], /SameSite=Lax/);
  assert.match(cookies[0], /Max-Age=604800/);
  assert.doesNotMatch(cookies[0], /Domain=/i);
  assert.equal(parseCookies(`csrf_token=${csrfToken}`)["csrf_token"], csrfToken);
});

test("cookie-authenticated unsafe requests require allowed Origin and matching CSRF token", () => {
  const csrf = "c".repeat(64);
  const req = { method: "POST", path: "/api/posts/create", headers: { cookie: `auth_token=jwt; csrf_token=${csrf}`, origin: "http://localhost:5173", "x-csrf-token": csrf }, get(name) { return this.headers[name.toLowerCase()]; } };
  let nextCalled = false;
  requestSecurity(req, responseStub(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);

  const badReq = { ...req, headers: { ...req.headers, "x-csrf-token": "wrong" } };
  const badRes = responseStub();
  requestSecurity(badReq, badRes, () => { throw new Error("should reject mismatched CSRF"); });
  assert.equal(badRes.statusCode, 403);
});

test("an untrusted browser origin is rejected", () => {
  const req = { method: "POST", path: "/login", headers: { origin: "https://attacker.example" }, get(name) { return this.headers[name.toLowerCase()]; } };
  const res = responseStub();
  requestSecurity(req, res, () => { throw new Error("should reject origin"); });
  assert.equal(res.statusCode, 403);
});

test("a leftover CSRF cookie without an auth cookie does not block public requests", () => {
  const req = { method: "POST", path: "/api/communications/reports", headers: { cookie: "csrf_token=old-token", origin: "http://localhost:5173" }, get(name) { return this.headers[name.toLowerCase()]; } };
  let nextCalled = false;
  requestSecurity(req, responseStub(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test("the auth middleware verifies cookie sessions and role checks against current account state", async () => {
  process.env.JWT_SECRET = "test-only-secret";
  const passwordHash = "test-only-password-hash";
  const token = jwt.sign({ id: 42, role: "user", cv: credentialVersion(passwordHash) }, process.env.JWT_SECRET, { expiresIn: "1m" });
  const originalQuery = pool.query;
  pool.query = async () => [[{ id: 42, role: "admin", password: passwordHash }]];
  const req = { headers: { cookie: `auth_token=${token}` } };
  let nextCalled = false;
  try {
    await verifyToken(req, responseStub(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.id, 42);
    assert.equal(req.user.role, "admin");
    assert.equal(checkRole(["admin", "owner"])(req, responseStub(), () => {}), undefined);

    pool.query = async () => [[{ id: 42, role: "user", password: "changed-password-hash" }]];
    const revoked = responseStub();
    await verifyToken({ headers: { cookie: `auth_token=${token}` } }, revoked, () => { throw new Error("password change should revoke old JWT"); });
    assert.equal(revoked.statusCode, 401);
  } finally {
    pool.query = originalQuery;
  }

  const denied = responseStub();
  const deniedReq = { user: { role: "user" } };
  checkRole(["admin", "owner"])(deniedReq, denied, () => { throw new Error("should reject role"); });
  assert.equal(denied.statusCode, 403);
});

test("credential version changes when a password hash changes", () => {
  process.env.JWT_SECRET = "test-only-secret";
  assert.notEqual(credentialVersion("hash-one"), credentialVersion("hash-two"));
});

test("a Bearer header alone is no longer accepted as a session", () => {
  const req = { headers: { authorization: `Bearer ${jwt.sign({ id: 42, role: "admin" }, process.env.JWT_SECRET)}` } };
  const res = responseStub();
  verifyToken(req, res, () => { throw new Error("Bearer-only request must be rejected"); });
  assert.equal(res.statusCode, 401);
});
