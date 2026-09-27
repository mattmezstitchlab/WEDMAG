import assert from "node:assert/strict";
import test from "node:test";
import { defaultProjectName, parseProjectRequest } from "./project-validation";

const parse = (body: unknown) => parseProjectRequest(body);

test("create defaults to the documented name when none is given", () => {
  assert.deepEqual(parse({ action: "create" }), { ok: true, request: { action: "create", name: defaultProjectName } });
  assert.deepEqual(parse({ action: "create", name: "" }), { ok: true, request: { action: "create", name: defaultProjectName } });
  assert.deepEqual(parse({ action: "create", name: "   " }), { ok: true, request: { action: "create", name: defaultProjectName } });
  assert.deepEqual(parse({ action: "create", name: null }), { ok: true, request: { action: "create", name: defaultProjectName } });
});

test("create trims and keeps a valid name", () => {
  assert.deepEqual(parse({ action: "create", name: "  Le mariage d’Été  " }), {
    ok: true,
    request: { action: "create", name: "Le mariage d’Été" },
  });
});

test("create rejects an excessively long name", () => {
  const result = parse({ action: "create", name: "a".repeat(81) });
  assert.equal(result.ok, false);
  assert.equal(result.error, "name is too long");
});

test("create rejects a non-string name", () => {
  for (const name of [42, true, {}, ["x"]]) {
    const result = parse({ action: "create", name });
    assert.equal(result.ok, false, `name ${JSON.stringify(name)} must be rejected`);
    assert.equal(result.error, "Invalid name");
  }
});

test("attach and detach validate the subjectId against the catalogue", () => {
  assert.deepEqual(parse({ action: "attach", subjectId: "dj" }), { ok: true, request: { action: "attach", subjectId: "dj" } });
  assert.deepEqual(parse({ action: "detach", subjectId: " dj " }), { ok: true, request: { action: "detach", subjectId: "dj" } });
});

test("attach with an unknown subjectId is rejected, never coerced", () => {
  for (const body of [{ action: "attach", subjectId: "album" }, { action: "detach", subjectId: "x".repeat(4000) }]) {
    const result = parse(body);
    assert.equal(result.ok, false);
    assert.ok(result.error === "Unknown subjectId" || result.error === "subjectId is too long");
  }
});

test("attach without a subjectId is rejected", () => {
  const result = parse({ action: "attach" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "subjectId is required");
});

test("rejects unknown or missing actions", () => {
  for (const body of [{}, { action: "delete" }, { action: 42 }, { subjectId: "dj" }]) {
    const result = parse(body);
    assert.equal(result.ok, false, `body ${JSON.stringify(body)} must be rejected`);
    assert.equal(result.error, "Invalid action");
  }
});

test("rejects non-object bodies", () => {
  for (const body of [null, [], ["create"], "create", 42, true]) {
    const result = parse(body);
    assert.equal(result.ok, false);
    assert.equal(result.error, "Invalid request body");
  }
});
