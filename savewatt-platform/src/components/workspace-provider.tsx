"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  scopeForRole,
  type AppRole,
  type WorkspaceActor,
} from "@/lib/access-control";

const demoMode = process.env.NEXT_PUBLIC_SAVEWATT_DEMO_MODE === "true";

interface WorkspaceContextValue {
  actor: WorkspaceActor;
  canPreviewRoles: boolean;
  setPreviewRole: (role: AppRole) => void;
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
});

export function WorkspaceProvider({
  actor: authenticatedActor,
  children,
}: {
  actor: WorkspaceActor;
  children: React.ReactNode;
}) {
  const identityRole = authenticatedActor.role;
  const [previewRole, setPreviewRoleState] = useState<AppRole | null>(null);

  const canPreviewRoles = demoMode || identityRole === "SUPER_ADMIN";

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

  return (
    <WorkspaceContext.Provider value={{ actor, canPreviewRoles, setPreviewRole }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  return useContext(WorkspaceContext);
}
