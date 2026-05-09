import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveBinding } from "../../src/renderer/bindings.js";

test("resolveBinding $.path", () => {
  const data = { runs: [{ miles: 5 }, { miles: 7 }] };
  assert.equal(resolveBinding("$.runs[0].miles", data, null), 5);
  assert.equal(resolveBinding("$.runs[1].miles", data, null), 7);
});

test("resolveBinding nested object", () => {
  const data = { profile: { name: "Sam" } };
  assert.equal(resolveBinding("$.profile.name", data, null), "Sam");
});

test("resolveBinding $BACKEND when null returns null", () => {
  assert.equal(resolveBinding("$BACKEND/metrics", {}, null), null);
});

test("resolveBinding $BACKEND with url", () => {
  assert.equal(resolveBinding("$BACKEND/metrics", {}, "http://x"), "http://x/metrics");
});

test("resolveBinding literal string", () => {
  assert.equal(resolveBinding("hello", {}, null), "hello");
});
