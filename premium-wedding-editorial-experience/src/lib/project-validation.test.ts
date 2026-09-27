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

test("set-state accepts the two states of the current increment", () => {
  assert.deepEqual(parse({ action: "set-state", subjectId: "dj", state: "inspiration" }), {
    ok: true,
    request: { action: "set-state", subjectId: "dj", state: "inspiration" },
  });
  assert.deepEqual(parse({ action: "set-state", subjectId: "dj", state: "selection" }), {
    ok: true,
    request: { action: "set-state", subjectId: "dj", state: "selection" },
  });
});

test("set-state refuses states outside the modelled vocabulary", () => {
  for (const state of ["HACKED", "chosen", "", 42, null, true, ["selection"]]) {
    const result = parse({ action: "set-state", subjectId: "dj", state });
    assert.equal(result.ok, false, `state ${JSON.stringify(state)} must be rejected`);
    assert.equal(result.error, "Invalid state");
  }
});

test("set-state refuses reserved lifecycle states instead of simulating them", () => {
  // contact, proposition, engagement, contrat, confirme, preparation,
  // jour-j, archive are modelled but belong to future layers.
  for (const state of ["contact", "proposition", "engagement", "contrat", "confirme", "preparation", "jour-j", "archive"]) {
    const result = parse({ action: "set-state", subjectId: "dj", state });
    assert.equal(result.ok, false, `state ${state} must not be settable yet`);
    assert.equal(result.error, "state is not available yet");
  }
});

test("set-state validates the subjectId against the catalogue", () => {
  const result = parse({ action: "set-state", subjectId: "album", state: "selection" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "Unknown subjectId");
});

test("parcours-step validates the subjectId against the catalogue", () => {
  assert.deepEqual(parse({ action: "parcours-step", subjectId: "dj" }), {
    ok: true,
    request: { action: "parcours-step", subjectId: "dj" },
  });
  const result = parse({ action: "parcours-step", subjectId: "album" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "Unknown subjectId");
});

test("parcours-step rejects a missing subjectId", () => {
  const result = parse({ action: "parcours-step" });
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
