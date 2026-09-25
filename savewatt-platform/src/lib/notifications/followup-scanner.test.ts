import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterNewPlans,
  planDossierStatusNotifications,
  planIdentity,
  planStaleLeadFollowups,
  planTaskDueReminders,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  type DueTaskCandidate,
  type StaleLeadCandidate,
  type StatusChangeCandidate,
} from "./followup-scanner.ts";

const NOW = 1_800_000_000;

function task(overrides: Partial<DueTaskCandidate> = {}): DueTaskCandidate {
  return {
    id: "task-1",
    organizationId: "org-1",
    assigneeUserId: "user-1",
    title: "Relancer le client",
    dueAt: NOW + 12 * SECONDS_PER_HOUR,
    ...overrides,
  };
}

function lead(overrides: Partial<StaleLeadCandidate> = {}): StaleLeadCandidate {
  return {
    id: "lead-1",
    organizationId: "org-1",
    ownerUserId: "user-1",
    legalName: "Boulangerie Lamarck",
    updatedAt: NOW - 5 * SECONDS_PER_DAY,
    ...overrides,
  };
}

function statusEvent(overrides: Partial<StatusChangeCandidate> = {}): StatusChangeCandidate {
  return {
    eventId: "event-1",
    organizationId: "org-1",
    dossierId: "dossier-1",
    ownerUserId: "user-1",
    ownerEmail: "owner@example.test",
    summary: "Statut modifié : proposalReady → sent",
    from: "proposalReady",
    to: "sent",
    createdAt: NOW - 3600,
    ...overrides,
  };
}

describe("planTaskDueReminders", () => {
  it("plans a reminder for tasks due inside the window", () => {
    const plans = planTaskDueReminders([task()], NOW, 24);
    assert.equal(plans.length, 1);
    assert.equal(plans[0].type, "TASK_DUE_REMINDER");
    assert.equal(plans[0].userId, "user-1");
    assert.equal(plans[0].payload.overdue, false);
    assert.equal(plans[0].dedupeKey, `task-due:task-1:${NOW + 12 * SECONDS_PER_HOUR}`);
  });

  it("flags overdue tasks", () => {
    const plans = planTaskDueReminders([task({ dueAt: NOW - 600 })], NOW, 24);
    assert.equal(plans.length, 1);
    assert.equal(plans[0].payload.overdue, true);
  });

  it("ignores tasks due beyond the window", () => {
    const plans = planTaskDueReminders([task({ dueAt: NOW + 30 * SECONDS_PER_HOUR })], NOW, 24);
    assert.equal(plans.length, 0);
  });
});

describe("planStaleLeadFollowups", () => {
  it("plans a follow-up for leads idle past the threshold", () => {
    const plans = planStaleLeadFollowups([lead()], NOW, 3);
    assert.equal(plans.length, 1);
    assert.equal(plans[0].type, "LEAD_FOLLOWUP_REMINDER");
    assert.equal(plans[0].dedupeKey, "lead-stale:lead-1:3d");
  });

  it("ignores leads with recent activity", () => {
    const plans = planStaleLeadFollowups([lead({ updatedAt: NOW - SECONDS_PER_DAY })], NOW, 3);
    assert.equal(plans.length, 0);
  });
});

describe("planDossierStatusNotifications", () => {
  it("plans an in-app notification keyed on the event id", () => {
    const plans = planDossierStatusNotifications([statusEvent()], { sendEmail: false });
    assert.equal(plans.length, 1);
    assert.equal(plans[0].dedupeKey, "dossier-status:event-1");
    assert.equal(plans[0].email, undefined);
  });

  it("attaches an email only when enabled and an address exists", () => {
    const withEmail = planDossierStatusNotifications([statusEvent()], { sendEmail: true });
    assert.equal(withEmail[0].email?.to, "owner@example.test");
    const noAddress = planDossierStatusNotifications([statusEvent({ ownerEmail: null })], {
      sendEmail: true,
    });
    assert.equal(noAddress[0].email, undefined);
  });

  it("escapes HTML inside the status summary", () => {
    const plans = planDossierStatusNotifications(
      [statusEvent({ summary: "Statut <b>modifié</b> & validé" })],
      { sendEmail: true },
    );
    assert.ok(plans[0].email?.html.includes("&lt;b&gt;modifié&lt;/b&gt; &amp; validé"));
  });
});

describe("filterNewPlans", () => {
  it("drops plans whose identity already exists (idempotent re-run)", () => {
    const plans = [
      ...planTaskDueReminders([task()], NOW, 24),
      ...planStaleLeadFollowups([lead()], NOW, 3),
    ];
    const firstRun = filterNewPlans(plans, new Set());
    assert.equal(firstRun.length, 2);

    const existing = new Set(firstRun.map(planIdentity));
    const secondRun = filterNewPlans(plans, existing);
    assert.equal(secondRun.length, 0);
  });

  it("drops duplicate plans inside the same batch", () => {
    const plans = planTaskDueReminders([task(), task()], NOW, 24);
    const fresh = filterNewPlans(plans, new Set());
    assert.equal(fresh.length, 1);
  });

  it("keeps plans for other recipients of the same dedupe key", () => {
    const plans = planTaskDueReminders(
      [task(), task({ id: "task-1", assigneeUserId: "user-2" })],
      NOW,
      24,
    );
    const fresh = filterNewPlans(plans, new Set());
    assert.equal(fresh.length, 2);
  });
});
