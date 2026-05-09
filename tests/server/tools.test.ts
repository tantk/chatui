import { test } from "node:test";
import assert from "node:assert/strict";
import { dispatch } from "../../server/agent/tools/index.js";

test("marathon.addRun appends to runs", () => {
  const data: Record<string, any> = {};
  const r = dispatch("marathon.addRun", { date: "2026-05-09", miles: 5, pace: "8:30" }, data);
  assert.deepEqual(r, { ok: true, runsCount: 1 });
  assert.equal(data.runs.length, 1);
  assert.equal(data.runs[0].miles, 5);
});

test("jobs.moveStage moves a card between columns", () => {
  const data: Record<string, any> = {
    columns: [
      { name: "Applied", items: [{ id: "1", title: "Anthropic", subtitle: "SWE" }] },
      { name: "Onsite", items: [] },
    ],
  };
  const r = dispatch("jobs.moveStage", { id: "1", toStage: "Onsite" }, data);
  assert.equal((r as any).ok, true);
  assert.equal(data.columns[0].items.length, 0);
  assert.equal(data.columns[1].items.length, 1);
});

test("trip.addDay appends a day", () => {
  const data: Record<string, any> = {};
  dispatch("trip.addDay", { date: "Day 3", title: "Hakone", items: ["onsen"] }, data);
  assert.equal(data.days.length, 1);
  assert.equal(data.days[0].title, "Hakone");
});

test("dispatch throws on unknown handler", () => {
  assert.throws(() => dispatch("foo.bar", {}, {}), /unknown tool handler/);
});
