import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_WORKFLOW_STAGES,
  diffWorkflowStages,
  parseWorkflowStages,
  readStoredStages,
  WorkflowStageError,
} from "./workflow-stages.ts";

const defaults = () => DEFAULT_WORKFLOW_STAGES.map((stage) => ({ ...stage }));

test("accepts a reordered, relabelled stage list", () => {
  const input = defaults().reverse();
  input[0] = { ...input[0], labelFr: "  Abandonné  " };
  const stages = parseWorkflowStages(input);
  assert.equal(stages[0].key, "lost");
  assert.equal(stages[0].labelFr, "Abandonné");
  assert.equal(stages.length, 7);
});

test("rejects missing, duplicated or unknown stage keys", () => {
  assert.throws(() => parseWorkflowStages(defaults().slice(1)), WorkflowStageError);
  const duplicated = defaults();
  duplicated[1] = { ...duplicated[0] };
  assert.throws(() => parseWorkflowStages(duplicated), WorkflowStageError);
  const unknown = defaults();
  unknown[0] = { ...unknown[0], key: "archived" as never };
  assert.throws(() => parseWorkflowStages(unknown), WorkflowStageError);
});

test("rejects empty labels and invalid SLA values", () => {
  const empty = defaults();
  empty[2] = { ...empty[2], labelEn: " " };
  assert.throws(() => parseWorkflowStages(empty), /WORKFLOW_INVALID_STAGES/);
  const sla = defaults();
  sla[2] = { ...sla[2], slaHours: 1.5 };
  assert.throws(() => parseWorkflowStages(sla), WorkflowStageError);
});

test("unreadable stored JSON falls back to the defaults", () => {
  assert.deepEqual(readStoredStages("not json"), defaults());
});

test("diff lists order and field changes", () => {
  const next = defaults();
  next[0] = { ...next[0], slaHours: 48 };
  [next[5], next[6]] = [next[6], next[5]];
  assert.deepEqual(diffWorkflowStages(defaults(), next), ["order", "draft.slaHours"]);
});
