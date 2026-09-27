import { test } from "node:test";
import assert from "node:assert/strict";
import { seed, transition, stateSchema, nextRitualDate } from "../src/lib/domain";
function completed() {
  const s = transition(seed(), { type: "plan" });
  return transition(s, { type: "complete", id: s.moments[0].id });
}
test("only completed moments create a ritual; duplicate creation is idempotent", () => {
  const action = { type: "create-ritual", sourceId: "dinner-2026-09-25", name: "Bữa tối", recurrence: "weekly", time: "2026-09-27T19:30" } as const;
  assert.throws(() => transition(seed(), action));
  assert.throws(() => transition(transition(seed(), { type: "plan" }), action));
  const s = transition(completed(), action);
  assert.equal(s.rituals[0].completedCount, 1);
  assert.equal(s.rituals[0].totalOccurrences, 1);
  assert.deepEqual(transition(s, action), s);
  for (const time of ["2026-09-24T19:30", "2026-02-30T19:30", "2026-10-01T25:00"])
    assert.throws(() => transition(completed(), { ...action, time }));
});
test("each recurrence advances dates and creates unique, linked memory opportunities", () => {
  for (const recurrence of ["weekly", "biweekly", "monthly"] as const) {
    let s = transition(completed(), { type: "create-ritual", sourceId: "dinner-2026-09-25", name: "Bữa tối", recurrence, time: "2026-09-27T19:30" });
    const original = structuredClone(s.moments[0]);
    for (let count = 2; count <= 3; count++) {
      const action = { type: "complete-ritual", id: s.rituals[0].id, occurrence: s.rituals[0].nextOccurrence } as const;
      s = transition(s, action);
      assert.deepEqual(transition(s, action), s);
      assert.equal(s.rituals[0].completedCount, count);
      assert.equal(s.rituals[0].totalOccurrences, count);
      const sourceId = s.moments.at(-1)!.id;
      s = transition(s, { type: "memory", sourceId, note: `Lần ${count}`, art: "dinner" });
      assert.equal(s.memories[0].date, action.occurrence.slice(0, 10));
    }
    assert.equal(new Set(s.memories.map(m => m.sourceId)).size, 4);
    assert.deepEqual(s.moments[0], original);
    assert.deepEqual(stateSchema.parse(JSON.parse(JSON.stringify(s))), s);
    assert.deepEqual(transition(s, { type: "reset" }).rituals, []);
  }
});
test("monthly month-end clamps and restores the anchor day", () => {
  assert.equal(nextRitualDate("2027-01-31T19:30", "monthly", "2027-01-31T19:30"), "2027-02-28T19:30");
  assert.equal(nextRitualDate("2027-02-28T19:30", "monthly", "2027-01-31T19:30"), "2027-03-31T19:30");
});
test("older saved demos get an empty rituals collection without losing progress", () => {
  const s = completed();
  const { rituals: _, ...legacy } = s;
  assert.deepEqual(stateSchema.parse(legacy), s);
});
