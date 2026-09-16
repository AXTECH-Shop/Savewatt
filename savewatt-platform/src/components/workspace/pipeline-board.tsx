"use client";

import { useMemo, useState } from "react";
import { Funnel, Kanban, ListBullets, Plus } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { pathIsInScope } from "@/lib/access-control";
import { demoDeals, type DemoDeal } from "@/lib/demo-workspace";
import type { DossierStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/workspace-provider";
import { StatusPill } from "./status-pill";

const columns: Array<{ status: DossierStatus; label: string }> = [
  { status: "uploaded", label: "Documents reçus" },
  { status: "analyzed", label: "Analyse prête" },
  { status: "proposalReady", label: "Offre prête" },
  { status: "sent", label: "En signature" },
  { status: "signed", label: "Signé" },
];

const statusTone: Record<DossierStatus, "neutral" | "positive" | "warning" | "danger"> = {
  draft: "neutral",
  uploaded: "neutral",
  analyzed: "positive",
  proposalReady: "positive",
  sent: "warning",
  signed: "positive",
  lost: "danger",
};

function DealCard({ deal }: { deal: DemoDeal }) {
  return (
    <Link
      href={`/clients/${deal.id}`}
      className="press group block rounded-xl border border-line bg-surface p-4 shadow-soft hover:border-accent/35"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{deal.client}</p>
          <p className="nums mt-1 text-xs text-muted">{deal.pdl}</p>
        </div>
        <span className="font-mono text-[10px] text-faint">{deal.segment}</span>
      </div>
      <div className="mt-4 border-t border-line pt-3">
        <p className="text-xs font-medium text-ink">{deal.nextAction}</p>
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted">
          <span>{deal.owner}</span>
          <span>{deal.dueLabel}</span>
        </div>
      </div>
    </Link>
  );
}

export function PipelineBoard({ scope = "personal" }: { scope?: "personal" | "team" | "branch" }) {
  const { actor } = useWorkspace();
  const [view, setView] = useState<"board" | "list">("board");
  const [query, setQuery] = useState("");

  const deals = useMemo(() => {
    const scoped = demoDeals.filter((deal) => {
      if (scope === "personal") return deal.ownerId === actor.userId || actor.isPreview;
      return pathIsInScope(actor, deal.orgPath) || actor.isPreview;
    });
    const normalized = query.trim().toLowerCase();
    if (!normalized) return scoped;
    return scoped.filter((deal) =>
      [deal.client, deal.pdl, deal.owner, deal.status].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [actor, query, scope]);

  return (
    <section className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-10 min-w-0 max-w-md flex-1 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3">
          <Funnel size={16} className="text-faint" />
          <span className="sr-only">Filtrer les dossiers</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Client, PDL, responsable ou statut"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
        </label>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-line bg-surface p-1" aria-label="Mode d’affichage">
            <button
              onClick={() => setView("board")}
              className={`press rounded-md p-2 ${view === "board" ? "bg-accent-soft text-accent" : "text-muted"}`}
              aria-label="Afficher en colonnes"
              aria-pressed={view === "board"}
            >
              <Kanban size={17} />
            </button>
            <button
              onClick={() => setView("list")}
              className={`press rounded-md p-2 ${view === "list" ? "bg-accent-soft text-accent" : "text-muted"}`}
              aria-label="Afficher en liste"
              aria-pressed={view === "list"}
            >
              <ListBullets size={17} />
            </button>
          </div>
          <Link href="/new">
            <Button>
              <Plus size={17} weight="bold" /> Nouveau dossier
            </Button>
          </Link>
        </div>
      </div>

      {view === "board" ? (
        <div className="mt-5 grid gap-3 overflow-x-auto pb-3 lg:grid-cols-5">
          {columns.map((column) => {
            const columnDeals = deals.filter((deal) => deal.status === column.status);
            return (
              <div key={column.status} className="min-w-[17rem] rounded-2xl bg-surface-2 p-3 lg:min-w-0">
                <div className="flex items-center justify-between px-1 pb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{column.label}</h2>
                  <span className="nums rounded-full bg-surface px-2 py-0.5 text-xs text-faint">{columnDeals.length}</span>
                </div>
                <div className="space-y-3">
                  {columnDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                  {columnDeals.length === 0 && (
                    <p className="rounded-xl border border-dashed border-line px-3 py-8 text-center text-xs text-faint">Aucun dossier</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="hidden grid-cols-[1.3fr_0.85fr_0.75fr_0.8fr_0.7fr] gap-4 border-b border-line px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-faint md:grid">
            <span>Client</span><span>Responsable</span><span>Statut</span><span>Prochaine action</span><span className="text-right">Gain estimé</span>
          </div>
          <ul className="divide-y divide-line">
            {deals.map((deal) => (
              <li key={deal.id}>
                <Link href={`/clients/${deal.id}`} className="press grid gap-2 px-5 py-4 hover:bg-surface-2 md:grid-cols-[1.3fr_0.85fr_0.75fr_0.8fr_0.7fr] md:items-center md:gap-4">
                  <span><strong className="block text-sm text-ink">{deal.client}</strong><span className="nums text-xs text-muted">{deal.pdl}</span></span>
                  <span className="text-sm text-muted">{deal.owner}</span>
                  <span><StatusPill tone={statusTone[deal.status]}>{columns.find((column) => column.status === deal.status)?.label ?? deal.status}</StatusPill></span>
                  <span className="text-sm text-muted">{deal.nextAction}</span>
                  <span className="nums text-right text-sm font-semibold text-ink">{deal.annualSavingEur ? `${deal.annualSavingEur.toLocaleString("fr-FR")} €` : "—"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
