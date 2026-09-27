import { test } from "node:test";
import assert from "node:assert/strict";
import { seed, sharedWindows, transition, normalizeFamilyState, stateSchema } from "../src/lib/domain";
test("family availability produces the actual 45-minute intersection", () =>
  assert.deepEqual(sharedWindows(seed().members), [[1170, 1215]]));
test("privacy opt-out removes shared window", () => {
  const s = seed();
  s.members[3].share = false;
  assert.deepEqual(sharedWindows(s.members), []);
  assert.throws(() => transition(s, { type: "plan" }));
});
test("availability updates recompute overlap and preserve existing plans", () => {
  let s = transition(seed(), { type: "plan" });
  s = transition(s, {
    type: "availability",
    memberId: "minh",
    start: 1260,
    end: 1320,
    share: true,
  });
  assert.deepEqual(sharedWindows(s.members), []);
  assert.equal(s.moments[0].start, 1170);
});
test("invalid intervals are rejected, short availability is saved without a window", () => {
  assert.throws(() =>
    transition(seed(), {
      type: "availability",
      memberId: "minh",
      start: 1200,
      end: 1180,
      share: true,
    }),
  );
  assert.deepEqual(sharedWindows(
    transition(seed(), {
      type: "availability",
      memberId: "minh",
      start: 1180,
      end: 1200,
      share: true,
    }).members), []);
});
test("exact 30 minutes is valid, 29 is not, sharing gates calculation", () => {
  for (const [start, expected] of [[1200, [[1200, 1230]]], [1201, []], [1260, []]] as const) {
    const s = transition(seed(), { type: "availability", memberId: "minh", start, end: 1320, share: true });
    assert.deepEqual(sharedWindows(s.members), expected);
  }
  const hidden = transition(seed(), { type: "availability", memberId: "minh", start: 1200, end: 1260, share: false });
  assert.deepEqual(sharedWindows(hidden.members), []);
  assert.throws(() => transition(hidden, { type: "plan" }));
  const visible = transition(hidden, { type: "availability", memberId: "minh", start: 1200, end: 1260, share: true });
  assert.deepEqual(sharedWindows(visible.members), [[1200, 1230]]);
  assert.equal(transition(visible, { type: "plan" }).moments[0].end, 1230);
});
test("legacy schedules migrate without losing the existing appointment", () => {
  const legacy = transition(seed(), { type: "plan" });
  legacy.members[0].available = [[900, 1230]];
  legacy.members[2].available = [[1170, 1290]];
  legacy.members[3].available = [[1020, 1110], [1200, 1260]];
  const upgraded = normalizeFamilyState(stateSchema.parse(legacy));
  assert.deepEqual(upgraded.moments, legacy.moments);
  assert.deepEqual(upgraded.memories, legacy.memories);
  assert.deepEqual(upgraded.members[0].available, [[1080, 1230]]);
  assert.deepEqual(upgraded.members[2].available, [[1170, 1320]]);
  assert.deepEqual(sharedWindows(upgraded.members), [[1200, 1230]]);
});
test("care cannot skip a step and completed action is idempotent", () => {
  let s = seed();
  assert.throws(() => transition(s, { type: "care", status: "delivered" }));
  for (const status of ["accepted", "picked-up", "delivered"] as const)
    s = transition(s, { type: "care", status });
  assert.equal(s.care.helper, "minh");
  assert.deepEqual(transition(s, { type: "care", status: "delivered" }), s);
});
test("end-to-end moment completion produces one linked memory", () => {
  let s = seed();
  assert.throws(() => transition(s, { type: "complete", id: "missing" }));
  s = transition(s, { type: "plan" });
  s = transition(s, { type: "plan" });
  assert.equal(s.moments.length, 1);
  const sourceId = s.moments[0].id;
  assert.throws(() =>
    transition(s, { type: "memory", sourceId, note: "Hello", art: "dinner" }),
  );
  s = transition(s, { type: "complete", id: sourceId });
  s = transition(s, {
    type: "memory",
    sourceId,
    note: "Ba kể lại chuyện Đà Lạt.",
    art: "dinner",
  });
  s = transition(s, {
    type: "memory",
    sourceId,
    note: "Duplicate",
    art: "dinner",
  });
  assert.equal(s.memories.length, 3);
  assert.equal(s.memories[0].sourceId, sourceId);
  assert.equal(s.memories[0].participants.length, 4);
  assert.deepEqual(transition(s, { type: "reset" }).memories, seed().memories);
});
