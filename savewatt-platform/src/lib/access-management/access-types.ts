import type { AppRole } from "@/lib/access-control";

export const ORGANIZATION_KINDS = ["OPERATOR", "MASTER", "SUB_REGIE", "TEAM"] as const;
export type OrganizationKind = (typeof ORGANIZATION_KINDS)[number];

export interface OrganizationRecord {
  id: string;
  parentId: string | null;
  kind: OrganizationKind;
  name: string;
  slug: string;
  path: string;
  depth: number;
  status: "ACTIVE" | "SUSPENDED";
  maxChildOrganizations: number | null;
  maxMembers: number | null;
  activeMembers: number;
  openDossiers: number;
  version: number;
}

export interface MembershipRecord {
  userId: string;
  organizationId: string;
  organizationName: string;
  displayName: string;
  email: string;
  role: AppRole;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  version: number;
}

export interface InvitationRecord {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  role: AppRole;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  expiresAt: number;
  createdAt: number;
  version: number;
}

export interface RegistrationRequestRecord {
  clerkUserId: string;
  email: string;
  displayName: string;
  accountType: "CUSTOMER" | "PARTNER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: number;
  version: number;
}

export interface WhitelistRecord {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "OPERATOR_FINANCE";
  organizationId: string;
  organizationName: string;
  status: "ACTIVE" | "REVOKED";
  createdAt: number;
}
