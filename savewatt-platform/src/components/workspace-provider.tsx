"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  isAppRole,
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

interface ClerkMetadata {
  savewattRole?: unknown;
  orgPath?: unknown;
  orgName?: unknown;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const metadata = (user?.publicMetadata ?? {}) as ClerkMetadata;
  const identityRole = isAppRole(metadata.savewattRole)
    ? metadata.savewattRole
    : demoMode
      ? "SUPER_ADMIN"
      : "APPORTEUR";
  const [previewRole, setPreviewRoleState] = useState<AppRole | null>(null);

  const canPreviewRoles = demoMode || identityRole === "SUPER_ADMIN";

  const actor = useMemo<WorkspaceActor>(() => {
    const role = canPreviewRoles ? (previewRole ?? identityRole) : identityRole;
    const orgName =
      typeof metadata.orgName === "string"
        ? metadata.orgName
        : fallbackActor.orgName;
    const orgPath =
      typeof metadata.orgPath === "string" ? metadata.orgPath : fallbackActor.orgPath;

    return {
      userId: user?.id ?? fallbackActor.userId,
      displayName: user?.fullName ?? fallbackActor.displayName,
      email: user?.primaryEmailAddress?.emailAddress ?? fallbackActor.email,
      role,
      orgId: fallbackActor.orgId,
      orgName,
      orgPath,
      scope: scopeForRole(role),
      isPreview: !isLoaded || !user || role !== identityRole,
    };
  }, [canPreviewRoles, identityRole, isLoaded, metadata.orgName, metadata.orgPath, previewRole, user]);

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
