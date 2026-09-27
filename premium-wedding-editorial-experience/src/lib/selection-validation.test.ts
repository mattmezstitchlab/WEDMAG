import assert from "node:assert/strict";
import test from "node:test";
import { subjects } from "./wedding-data";
import { parseSelectionRequest, selectionStatuses } from "./selection-validation";

const valid = (body: unknown) => parseSelectionRequest(body);

test("accepts a catalogue subject with an explicit official status", () => {
  const result = valid({ subjectId: "saxophoniste", status: "chosen" });
  assert.deepEqual(result, {
    ok: true,
    write: { kind: "upsert", subjectId: "saxophoniste", status: "chosen" },
  });
});

test("defaults to interested when no status is provided", () => {
  const result = valid({ subjectId: "photographe" });
  assert.deepEqual(result, {
    ok: true,
    write: { kind: "upsert", subjectId: "photographe", status: "interested" },
  });
});

test("trims the subjectId before validating it", () => {
  const result = valid({ subjectId: "  dj  ", status: "contacted" });
  assert.deepEqual(result, {
    ok: true,
    write: { kind: "upsert", subjectId: "dj", status: "contacted" },
  });
});

test("accepts a removal for a catalogue subject", () => {
  const result = valid({ subjectId: "dj", action: "remove" });
  assert.deepEqual(result, { ok: true, write: { kind: "remove", subjectId: "dj" } });
});

test("rejects a subjectId that is not in the catalogue", () => {
  for (const body of [{ subjectId: "album" }, { subjectId: "does-not-exist", status: "chosen" }]) {
    const result = valid(body);
    assert.equal(result.ok, false);
    assert.equal(result.error, "Unknown subjectId");
  }
});

test("rejects an excessively long subjectId", () => {
  const result = valid({ subjectId: "a".repeat(4000), status: "chosen" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "subjectId is too long");
});

test("rejects a missing, empty or whitespace-only subjectId", () => {
  for (const body of [{}, { subjectId: "" }, { subjectId: "   " }, { status: "chosen" }]) {
    const result = valid(body);
    assert.equal(result.ok, false);
    assert.equal(result.error, "subjectId is required");
  }
});

test("rejects a non-string subjectId", () => {
  for (const subjectId of [123, null, ["dj"], { id: "dj" }]) {
    const result = valid({ subjectId });
    assert.equal(result.ok, false);
    assert.equal(result.error, "subjectId is required");
  }
});

test("rejects an invalid status instead of coercing it", () => {
  // Regression (audit M2): an invalid status used to silently downgrade an
  // existing valid status to "interested". It must now be rejected.
  for (const status of ["HACKED", "chosen ", "CHOSEN", "", 42, true, { status: "chosen" }, ["chosen"]]) {
    const result = valid({ subjectId: "dj", status });
    assert.equal(result.ok, false, `status ${JSON.stringify(status)} must be rejected`);
    assert.equal(result.error, "Invalid status");
  }
});

test("rejects an invalid status even on a removal", () => {
  const result = valid({ subjectId: "dj", action: "remove", status: "garbage" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "Invalid status");
});

test("rejects an unknown action", () => {
  const result = valid({ subjectId: "dj", action: "delete" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "Invalid action");
});

test("rejects non-object bodies", () => {
  for (const body of [null, [], ["dj"], "dj", 42, true]) {
    const result = valid(body);
    assert.equal(result.ok, false, `body ${JSON.stringify(body)} must be rejected`);
    assert.equal(result.error, "Invalid request body");
  }
});

test("accepts every catalogue subject with every official status", () => {
  assert.ok(subjects.length >= 36, "catalogue unexpectedly small");
  for (const subject of subjects) {
    for (const status of selectionStatuses) {
      const result = valid({ subjectId: subject.id, status });
      assert.deepEqual(result, {
        ok: true,
        write: { kind: "upsert", subjectId: subject.id, status },
      });
    }
    const removal = valid({ subjectId: subject.id, action: "remove" });
    assert.deepEqual(removal, { ok: true, write: { kind: "remove", subjectId: subject.id } });
  }
});

test("the official statuses are exactly the three documented ones", () => {
  assert.deepEqual([...selectionStatuses], ["interested", "contacted", "chosen"]);
});
