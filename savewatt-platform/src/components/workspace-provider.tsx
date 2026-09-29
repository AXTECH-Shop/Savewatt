"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  scopeForRole,
  type AppRole,
  type PreviewTarget,
  type WorkspaceActor,
} from "@/lib/access-control";

const demoMode = process.env.NEXT_PUBLIC_SAVEWATT_DEMO_MODE === "true";

interface WorkspaceContextValue {
  actor: WorkspaceActor;
  /** Demo build only: client-side role switch with sample data. */
  canPreviewRoles: boolean;
  setPreviewRole: (role: AppRole) => void;
  /** Super admin: organizations that can be previewed read-only with real scoped data. */
  previewTargets: PreviewTarget[];
  startPreview: (organizationId: string | null) => Promise<void>;
}

const fallbackActor: WorkspaceActor = {
  userId: "demo-apporteur",
  displayName: "Nicolas Bernard",
  email: "nicolas.bernard@savewatt.fr",
  role: "APPORTEUR",
  orgId: "team-paris-ouest",
  orgName: "Équipe Paris Ouest",
  orgPath: "axtech.ile_de_france.paris_ouest",
  scope: "OWNED",
  isPreview: true,
};

const WorkspaceContext = createContext<WorkspaceContextValue>({
  actor: fallbackActor,
  canPreviewRoles: false,
  setPreviewRole: () => undefined,
  previewTargets: [],
  startPreview: async () => undefined,
});

export function WorkspaceProvider({
  actor: authenticatedActor,
  previewTargets = [],
  children,
}: {
  actor: WorkspaceActor;
  previewTargets?: PreviewTarget[];
  children: React.ReactNode;
}) {
  const identityRole = authenticatedActor.role;
  const [previewRole, setPreviewRoleState] = useState<AppRole | null>(null);

  const canPreviewRoles = demoMode;

  const actor = useMemo<WorkspaceActor>(() => {
    const role = canPreviewRoles ? (previewRole ?? identityRole) : identityRole;

    return {
      ...authenticatedActor,
      role,
      scope: scopeForRole(role),
      isPreview: authenticatedActor.isPreview || role !== identityRole,
    };
  }, [authenticatedActor, canPreviewRoles, identityRole, previewRole]);

  function setPreviewRole(role: AppRole) {
    if (!canPreviewRoles) return;
    setPreviewRoleState(role);
  }

  async function startPreview(organizationId: string | null) {
    const response = await fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId }),
    });
    if (response.ok) window.location.assign(window.location.pathname.split("/").slice(0, 2).join("/") || "/");
  }

  return (
    <WorkspaceContext.Provider value={{ actor, canPreviewRoles, setPreviewRole, previewTargets, startPreview }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  return useContext(WorkspaceContext);
}
