import assert from "node:assert/strict";
import test from "node:test";
import { defaultProjectName, parseProjectRequest } from "./project-validation";

const parse = (body: unknown) => parseProjectRequest(body);

test("create defaults to the documented name and the only real situation when none is given", () => {
  const expected = { ok: true, request: { action: "create", name: defaultProjectName, situation: "mariage" } };
  assert.deepEqual(parse({ action: "create" }), expected);
  assert.deepEqual(parse({ action: "create", name: "" }), expected);
  assert.deepEqual(parse({ action: "create", name: "   " }), expected);
  assert.deepEqual(parse({ action: "create", name: null }), expected);
  assert.deepEqual(parse({ action: "create", situation: null }), expected);
});

test("create trims and keeps a valid name", () => {
  assert.deepEqual(parse({ action: "create", name: "  Le mariage d’Été  " }), {
    ok: true,
    request: { action: "create", name: "Le mariage d’Été", situation: "mariage" },
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

test("create accepts the only situation that is real today", () => {
  assert.deepEqual(parse({ action: "create", situation: "mariage" }), {
    ok: true,
    request: { action: "create", name: defaultProjectName, situation: "mariage" },
  });
  assert.deepEqual(parse({ action: "create", situation: "  mariage  " }), {
    ok: true,
    request: { action: "create", name: defaultProjectName, situation: "mariage" },
  });
});

test("create rejects an unknown or malformed situation, never coerced", () => {
  for (const situation of [42, true, {}, ["mariage"]]) {
    const result = parse({ action: "create", situation });
    assert.equal(result.ok, false, `situation ${JSON.stringify(situation)} must be rejected`);
    assert.equal(result.error, "Invalid situation");
  }
  for (const situation of ["fitness", "mariage-hack", "wedding", "MARIAGE", "diplome"]) {
    const result = parse({ action: "create", situation });
    assert.equal(result.ok, false, `situation ${situation} must be rejected`);
    assert.equal(result.error, "Invalid situation");
  }
});

test("create refuses a modelled situation that is not real yet — nothing is invented", () => {
  for (const situation of ["naissance", "deuil", "reconnexion", "couple-famille", "transmission"]) {
    const result = parse({ action: "create", situation });
    assert.equal(result.ok, false, `situation ${situation} must not be creatable yet`);
    assert.equal(result.error, "situation is not available yet");
  }
});

test("set-state still cannot force contact — the only path is the couple's declaration", () => {
  const result = parse({ action: "set-state", subjectId: "dj", state: "contact" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "state is not available yet");
});

test("contact-add accepts a catalogue reference belonging to the dossier's subject", () => {
  assert.deepEqual(parse({ action: "contact-add", subjectId: "photographe", professionalRef: "photographe:camille-novae" }), {
    ok: true,
    request: { action: "contact-add", subjectId: "photographe", professionalRef: "photographe:camille-novae", name: null, role: null },
  });
  // Whitespace is trimmed, the reference itself is never rewritten.
  assert.deepEqual(parse({ action: "contact-add", subjectId: "photographe", professionalRef: "  photographe:camille-novae  " }), {
    ok: true,
    request: { action: "contact-add", subjectId: "photographe", professionalRef: "photographe:camille-novae", name: null, role: null },
  });
});

test("contact-add rejects an unknown or malformed professionalRef, never coerced", () => {
  for (const professionalRef of [42, true, {}, ["x"]]) {
    const result = parse({ action: "contact-add", subjectId: "photographe", professionalRef });
    assert.equal(result.ok, false, `professionalRef ${JSON.stringify(professionalRef)} must be rejected`);
    assert.equal(result.error, "Invalid professionalRef");
  }
  for (const [label, body] of [
    ["unknown id within the right subject", { action: "contact-add", subjectId: "photographe", professionalRef: "photographe:inconnu" }],
    ["a reference from another subject's universe", { action: "contact-add", subjectId: "dj", professionalRef: "photographe:camille-novae" }],
    ["no pair at all", { action: "contact-add", subjectId: "photographe", professionalRef: "camille-novae" }],
    ["hard cap before any catalogue lookup", { action: "contact-add", subjectId: "photographe", professionalRef: `photographe:${"a".repeat(200)}` }],
  ] as const) {
    const result = parse(body);
    assert.equal(result.ok, false, label);
    assert.equal(result.error, label.includes("pair") || label.includes("cap") ? "Invalid professionalRef" : "Unknown professionalRef");
  }
});

test("contact-add accepts a declared person with a valid name and optional role", () => {
  assert.deepEqual(parse({ action: "contact-add", subjectId: "photographe", name: "  Marie Dupont  ", role: " Photographe " }), {
    ok: true,
    request: { action: "contact-add", subjectId: "photographe", professionalRef: null, name: "Marie Dupont", role: "Photographe" },
  });
  assert.deepEqual(parse({ action: "contact-add", subjectId: "photographe", name: "Marie Dupont" }), {
    ok: true,
    request: { action: "contact-add", subjectId: "photographe", professionalRef: null, name: "Marie Dupont", role: null },
  });
});

test("contact-add rejects a nameless, oversized or malformed declared person", () => {
  for (const [label, body, error] of [
    ["neither a reference nor a declaration", { action: "contact-add", subjectId: "photographe" }, "name is required"],
    ["a blank name", { action: "contact-add", subjectId: "photographe", name: "   " }, "name is required"],
    ["an oversized name", { action: "contact-add", subjectId: "photographe", name: "a".repeat(81) }, "name is too long"],
    ["an oversized role", { action: "contact-add", subjectId: "photographe", name: "Marie", role: "r".repeat(81) }, "role is too long"],
    ["a non-string name", { action: "contact-add", subjectId: "photographe", name: 42 }, "Invalid name"],
    ["a non-string role", { action: "contact-add", subjectId: "photographe", name: "Marie", role: 42 }, "Invalid role"],
  ] as const) {
    const result = parse(body);
    assert.equal(result.ok, false, label);
    assert.equal(result.error, error);
  }
});

test("contact-add refuses a contact that is both a reference and a declaration", () => {
  const result = parse({ action: "contact-add", subjectId: "photographe", professionalRef: "photographe:camille-novae", name: "Marie Dupont" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "professionalRef and name are mutually exclusive");
});

test("contact-attest and contact-remove require a valid contactId", () => {
  for (const [label, body, error] of [
    ["attest without contactId", { action: "contact-attest", subjectId: "photographe" }, "contactId is required"],
    ["attest with a blank contactId", { action: "contact-attest", subjectId: "photographe", contactId: "  " }, "contactId is required"],
    ["attest with a non-string contactId", { action: "contact-attest", subjectId: "photographe", contactId: 42 }, "contactId is required"],
    ["attest with an oversized contactId", { action: "contact-attest", subjectId: "photographe", contactId: "c".repeat(65) }, "contactId is too long"],
    ["remove without contactId", { action: "contact-remove", subjectId: "photographe" }, "contactId is required"],
  ] as const) {
    const result = parse(body);
    assert.equal(result.ok, false, label);
    assert.equal(result.error, error);
  }

  assert.deepEqual(parse({ action: "contact-remove", subjectId: "photographe", contactId: "uuid-1" }), {
    ok: true,
    request: { action: "contact-remove", subjectId: "photographe", contactId: "uuid-1" },
  });
});

test("contact-attest carries an optional, bounded note", () => {
  assert.deepEqual(parse({ action: "contact-attest", subjectId: "photographe", contactId: "uuid-1", note: "  Rencontre au salon  " }), {
    ok: true,
    request: { action: "contact-attest", subjectId: "photographe", contactId: "uuid-1", note: "Rencontre au salon" },
  });
  assert.deepEqual(parse({ action: "contact-attest", subjectId: "photographe", contactId: "uuid-1", note: "   " }), {
    ok: true,
    request: { action: "contact-attest", subjectId: "photographe", contactId: "uuid-1", note: null },
  });
  for (const [label, body, error] of [
    ["an oversized note", { action: "contact-attest", subjectId: "photographe", contactId: "uuid-1", note: "n".repeat(501) }, "note is too long"],
    ["a non-string note", { action: "contact-attest", subjectId: "photographe", contactId: "uuid-1", note: 42 }, "Invalid note"],
  ] as const) {
    const result = parse(body);
    assert.equal(result.ok, false, label);
    assert.equal(result.error, error);
  }
});

test("contact-proposition and contact-engage (B2) carry the same optional, bounded note", () => {
  for (const action of ["contact-proposition", "contact-engage"] as const) {
    assert.deepEqual(parse({ action, subjectId: "photographe", contactId: "uuid-1", note: "  Sa proposition  " }), {
      ok: true,
      request: { action, subjectId: "photographe", contactId: "uuid-1", note: "Sa proposition" },
    });
    assert.deepEqual(parse({ action, subjectId: "photographe", contactId: "uuid-1" }), {
      ok: true,
      request: { action, subjectId: "photographe", contactId: "uuid-1", note: null },
    });
    for (const [label, body, error] of [
      ["without contactId", { action, subjectId: "photographe" }, "contactId is required"],
      ["with an oversized note", { action, subjectId: "photographe", contactId: "uuid-1", note: "n".repeat(501) }, "note is too long"],
      ["with a non-string note", { action, subjectId: "photographe", contactId: "uuid-1", note: 42 }, "Invalid note"],
      ["with an oversized contactId", { action, subjectId: "photographe", contactId: "c".repeat(65) }, "contactId is too long"],
    ] as const) {
      const result = parse(body);
      assert.equal(result.ok, false, `${action} ${label}`);
      assert.equal(result.error, error);
    }
  }
});

test("contact-confirm carries an optional, bounded note like contact-attest", () => {
  assert.deepEqual(parse({ action: "contact-confirm", subjectId: "photographe", contactId: "uuid-1", note: "  Il nous a confirmé  " }), {
    ok: true,
    request: { action: "contact-confirm", subjectId: "photographe", contactId: "uuid-1", note: "Il nous a confirmé" },
  });
  assert.deepEqual(parse({ action: "contact-confirm", subjectId: "photographe", contactId: "uuid-1" }), {
    ok: true,
    request: { action: "contact-confirm", subjectId: "photographe", contactId: "uuid-1", note: null },
  });
  for (const [label, body, error] of [
    ["without contactId", { action: "contact-confirm", subjectId: "photographe" }, "contactId is required"],
    ["with an oversized note", { action: "contact-confirm", subjectId: "photographe", contactId: "uuid-1", note: "n".repeat(501) }, "note is too long"],
    ["with a non-string note", { action: "contact-confirm", subjectId: "photographe", contactId: "uuid-1", note: 42 }, "Invalid note"],
    ["with an oversized contactId", { action: "contact-confirm", subjectId: "photographe", contactId: "c".repeat(65) }, "contactId is too long"],
  ] as const) {
    const result = parse(body);
    assert.equal(result.ok, false, label);
    assert.equal(result.error, error);
  }
});

test("contact actions validate the subjectId against the catalogue like every other action", () => {
  for (const action of ["contact-add", "contact-attest", "contact-remove"]) {
    const result = parse({ action, subjectId: "inexistant", contactId: "uuid-1" });
    assert.equal(result.ok, false, action);
    assert.equal(result.error, "Unknown subjectId");
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

/**
 * Phase C — moment-hour: the couple sets their hour for a moment of the
 * day, or clears it (null = back to the proposed hour). Strict HH:MM.
 */
test("moment-hour accepts a strict HH:MM, trims it, and accepts null as a reset", () => {
  assert.deepEqual(parse({ action: "moment-hour", moment: "Cérémonie", hour: "  16:30  " }), {
    ok: true,
    request: { action: "moment-hour", moment: "Cérémonie", hour: "16:30" },
  });
  assert.deepEqual(parse({ action: "moment-hour", moment: "Cérémonie", hour: null }), {
    ok: true,
    request: { action: "moment-hour", moment: "Cérémonie", hour: null },
  });
  assert.deepEqual(parse({ action: "moment-hour", moment: "Cérémonie" }), {
    ok: true,
    request: { action: "moment-hour", moment: "Cérémonie", hour: null },
  });
  for (const [label, body, error] of [
    ["with an impossible hour", { action: "moment-hour", moment: "Cérémonie", hour: "25:00" }, "Invalid hour"],
    ["with a loose hour", { action: "moment-hour", moment: "Cérémonie", hour: "9h" }, "Invalid hour"],
    ["with an unknown moment", { action: "moment-hour", moment: "Bogus", hour: "10:00" }, "Unknown moment"],
    ["with a non-string hour", { action: "moment-hour", moment: "Cérémonie", hour: 42 }, "Invalid hour"],
  ] as const) {
    const result = parse(body);
    assert.equal(result.ok, false, label);
    assert.equal(result.error, error);
  }
});
