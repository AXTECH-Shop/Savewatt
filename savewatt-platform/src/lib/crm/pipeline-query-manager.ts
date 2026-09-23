import "server-only";

import type { WorkspaceActor } from "@/lib/access-control";
import { demoDeals } from "@/lib/demo-workspace";
import { DossierRepository } from "./dossier-repository";
import type { PipelineDeal } from "./crm-types";

export class PipelineQueryManager {
  constructor(private readonly dossiers = new DossierRepository()) {}

  async list(actor: WorkspaceActor): Promise<PipelineDeal[]> {
    if (actor.isPreview) {
      return demoDeals.map((deal) => ({
        id: deal.id,
        client: deal.client,
        owner: deal.owner,
        pdl: deal.pdl,
        segment: deal.segment as PipelineDeal["segment"],
        status: deal.status,
        annualSavingEur: deal.annualSavingEur,
        nextAction: deal.nextAction,
        dueAt: null,
        dueLabel: deal.dueLabel,
      }));
    }

    const dossiers = await this.dossiers.list(actor);
    return dossiers.map((dossier) => ({
      id: dossier.id,
      client: dossier.clientName,
      owner: dossier.ownerName,
      pdl: dossier.pdl,
      segment: dossier.segment,
      status: dossier.status,
      annualSavingEur: null,
      nextAction: dossier.nextTask,
      dueAt: dossier.nextTaskDueAt,
      dueLabel: null,
    }));
  }
}
