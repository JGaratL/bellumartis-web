import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://bellumartis.test/" });
globalThis.window = dom.window;
globalThis.DOMParser = dom.window.DOMParser;

const { sanitizeArticleHtml, sanitizeEmailHtml, hasExternalEmailImages } = await import("../src/utils/htmlSanitizers.js");

test("frontend article policy blocks XSS payloads and retains allowed Blogger players", () => {
  const safe = sanitizeArticleHtml(`
    <script>alert(1)</script><h2>Sección</h2><p onclick="alert(2)">Texto <b>válido</b></p>
    <img src="https://example.com/image.jpg" onerror="alert(3)">
    <a href="javascript:alert(4)">malo</a>
    <iframe src="https://attacker.example/embed/x"></iframe>
    <iframe src="https://www.youtube.com/embed/abc"></iframe>
  `);
  assert.doesNotMatch(safe, /<script|onclick|onerror|javascript:|attacker\.example/i);
  assert.match(safe, /<h2>Sección<\/h2>/);
  assert.match(safe, /<b>válido<\/b>/);
  assert.match(safe, /https:\/\/www\.youtube\.com\/embed\/abc/);
});

test("email policy strips executable content and blocks remote images until explicitly requested", () => {
  const dirty = `
    <script>alert(1)</script><form action="https://attacker.example"><input></form>
    <p onclick="alert(2)">Hola</p><a href="javascript:alert(3)">enlace</a>
    <iframe src="https://attacker.example/embed/x"></iframe>
    <img src="https://tracker.example/pixel.gif" onerror="alert(4)" alt="Imagen">
    <img src="data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PkE8L3NjcmlwdD48L3N2Zz4=" alt="SVG">
    <p style="background-image: url(https://tracker.example/bg)">Fondo</p>
  `;
  const blocked = sanitizeEmailHtml(dirty);
  assert.doesNotMatch(blocked, /<script|<form|<input|<iframe|onclick|onerror|javascript:/i);
  assert.match(blocked, /alt="Imagen"/);
  assert.doesNotMatch(blocked, /src="https:\/\/tracker\.example/);
  assert.doesNotMatch(blocked, /data:image|background-image|tracker\.example\/bg/);
  assert.equal(hasExternalEmailImages(dirty), true);

  const allowedAfterClick = sanitizeEmailHtml(dirty, { allowExternalImages: true });
  assert.match(allowedAfterClick, /src="https:\/\/tracker\.example\/pixel\.gif"/);
});
