import assert from "node:assert/strict";
import test from "node:test";
import { GET, POST } from "./route";

/**
 * Route-level wiring of the strict validation, on the local_only path
 * (these tests require DATABASE_URL to be unset — the database-backed
 * paths are covered by the runtime test battery on a real PostgreSQL).
 */

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/wedding/selections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

test("GET answers local_only without a database", async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { selections: [], persistence: "local_only" });
});

test("POST accepts a catalogue subject without a database", async () => {
  const response = await post({ subjectId: "saxophoniste", status: "chosen" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    subjectId: "saxophoniste",
    persistence: "local_only",
  });
});

test("POST rejects an unknown subjectId with 400", async () => {
  const response = await post({ subjectId: "album", status: "chosen" });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Unknown subjectId" });
});

test("POST rejects an excessively long subjectId with 400", async () => {
  const response = await post({ subjectId: "a".repeat(4000) });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "subjectId is too long" });
});

test("POST rejects an invalid status with 400", async () => {
  const response = await post({ subjectId: "dj", status: "HACKED" });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid status" });
});

test("POST rejects an invalid JSON body with 400", async () => {
  const response = await post("{oops");
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid JSON body" });
});
