import assert from "node:assert/strict";
import test from "node:test";
import { GET, POST } from "./route";

/**
 * Route-level wiring of the PACTE project endpoint on the local_only path
 * (these tests require DATABASE_URL to be unset — the database-backed paths
 * are covered by the runtime test battery on a real PostgreSQL).
 */

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/wedding/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

test("GET answers local_only with no project when no database is configured", async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { project: null, persistence: "local_only" });
});

test("POST create answers honestly in local_only (browser keeps the project)", async () => {
  const response = await post({ action: "create", name: "Mon mariage" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, persistence: "local_only" });
});

test("POST attach answers honestly in local_only", async () => {
  const response = await post({ action: "attach", subjectId: "dj" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, persistence: "local_only" });
});

test("POST detach answers honestly in local_only", async () => {
  const response = await post({ action: "detach", subjectId: "dj" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, persistence: "local_only" });
});

test("POST rejects an unknown subjectId with 400", async () => {
  const response = await post({ action: "attach", subjectId: "album" });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Unknown subjectId" });
});

test("POST rejects an excessively long subjectId with 400", async () => {
  const response = await post({ action: "attach", subjectId: "a".repeat(4000) });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "subjectId is too long" });
});

test("POST rejects an invalid action with 400", async () => {
  const response = await post({ action: "delete", subjectId: "dj" });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid action" });
});

test("POST rejects an invalid JSON body with 400", async () => {
  const response = await post("{oops");
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid JSON body" });
});

test("POST rejects a too-long project name with 400", async () => {
  const response = await post({ action: "create", name: "a".repeat(81) });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "name is too long" });
});
