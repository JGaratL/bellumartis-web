const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeArticleHtml } = require("../services/htmlSanitizers");

test("article sanitizer removes executable markup while preserving editorial formatting and trusted players", () => {
  const dirty = `
    <script>alert(1)</script>
    <p onclick="alert(2)">Texto <strong>importante</strong></p>
    <img src="https://example.com/photo.jpg" onerror="alert(3)" alt="Foto">
    <a href="javascript:alert(4)" onclick="alert(5)">enlace malo</a>
    <a href="https://example.com/info">enlace bueno</a>
    <iframe src="https://evil.example/embed/1"></iframe>
    <iframe src="https://www.youtube.com/embed/abc123" onload="alert(6)"></iframe>
    <iframe src="https://www.ivoox.com/player_ej_123_1.html"></iframe>
  `;

  const safe = sanitizeArticleHtml(dirty);
  assert.doesNotMatch(safe, /<script|onerror|onclick|onload|javascript:|evil\.example/i);
  assert.match(safe, /<p>Texto <strong>importante<\/strong><\/p>/);
  assert.match(safe, /<img src="https:\/\/example\.com\/photo\.jpg" alt="Foto"/);
  assert.match(safe, /href="https:\/\/example\.com\/info"/);
  assert.match(safe, /src="https:\/\/www\.youtube\.com\/embed\/abc123"/);
  assert.match(safe, /src="https:\/\/www\.ivoox\.com\/player_ej_123_1\.html"/);
  assert.match(safe, /sandbox="allow-scripts allow-same-origin allow-presentation"/);
});

test("article sanitizer rejects javascript image URLs and non-HTTPS or non-player iframes", () => {
  const safe = sanitizeArticleHtml(`
    <img src="javascript:alert(1)">
    <iframe src="http://www.youtube.com/embed/abc"></iframe>
    <iframe src="https://www.youtube.com/watch?v=abc"></iframe>
  `);
  assert.doesNotMatch(safe, /javascript:|<iframe/i);
});
