import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { DocuSealSubmissionRepository } from "@/lib/signing/docuseal-submission-repository";

/**
 * Creates a DocuSeal signing submission for a proposal.
 * If DocuSeal env vars are absent, returns a mock link so the demo flow still works.
 *
 * Env:
 *   DOCUSEAL_BASE_URL   e.g. https://api.docuseal.com  (or your self-hosted URL)
 *   DOCUSEAL_API_TOKEN  X-Auth-Token from DocuSeal
 *   DOCUSEAL_TEMPLATE_ID numeric template id to send
 *   DOCUSEAL_SIGN_URL   optional public base for signer links (default https://docuseal.com)
 */
export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  const demoMode = process.env.NEXT_PUBLIC_SAVEWATT_DEMO_MODE === "true";
  if (!userId && !demoMode) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const requestedEmail: string | undefined = body?.email;
  const requestedClientName: string | undefined = body?.clientName;
  const dossierId: string | undefined = body?.dossierId;

  if (!dossierId) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const base = process.env.DOCUSEAL_BASE_URL;
  const token = process.env.DOCUSEAL_API_TOKEN;
  const templateId = process.env.DOCUSEAL_TEMPLATE_ID;
  const signBase = process.env.DOCUSEAL_SIGN_URL ?? "https://docuseal.com";

  // Mock mode — no DocuSeal configured.
  if (!base || !token || !templateId) {
    if (
      !requestedEmail ||
      !/^\S+@\S+\.\S+$/.test(requestedEmail) ||
      !requestedClientName
    ) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }
    return NextResponse.json({
      provider: "mock",
      submissionId: `mock_${Date.now()}`,
      url: `${signBase}/s/demo-${encodeURIComponent(requestedClientName)}`,
    });
  }

  if (!userId || !orgId) {
    return NextResponse.json({ error: "UNAUTHENTICATED_OR_NO_ORGANIZATION" }, { status: 401 });
  }
  const repository = new DocuSealSubmissionRepository();
  const signingContext = await repository.getSigningContext(dossierId, userId, orgId);
  if (!signingContext) {
    return NextResponse.json({ error: "DOSSIER_NOT_FOUND_OR_FORBIDDEN" }, { status: 404 });
  }
  const existing = await repository.findActive(dossierId);
  if (existing) {
    return NextResponse.json({
      provider: "docuseal",
      submissionId: existing.providerSubmissionId,
      url: `${signBase}/s/${existing.providerSubmitterSlug}`,
      status: existing.status,
    });
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Token": token },
      body: JSON.stringify({
        template_id: Number(templateId),
        send_email: false,
        submitters: [
          {
            role: "Client",
            email: signingContext.signerEmail,
            name: signingContext.signerName,
            external_id: dossierId,
            require_email_2fa: true,
            metadata: { dossierId, initiatedBy: userId ?? "demo" },
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { provider: "docuseal", error: "docuseal_error" },
        { status: 502 },
      );
    }

    const data = await res.json();
    const submitter = Array.isArray(data) ? data[0] : data?.submitters?.[0] ?? data;
    const slug = submitter?.slug;
    if (typeof slug !== "string" || !slug) {
      return NextResponse.json(
        { provider: "docuseal", error: "docuseal_missing_submitter_slug" },
        { status: 502 },
      );
    }
    const url = submitter?.embed_src ?? `${signBase}/s/${slug}`;
    const providerSubmissionId = String(
      submitter?.submission_id ?? data?.id ?? submitter?.id ?? "",
    );
    const providerSubmitterId = submitter?.id ? String(submitter.id) : null;
    if (!providerSubmissionId) {
      return NextResponse.json(
        { provider: "docuseal", error: "docuseal_invalid_response" },
        { status: 502 },
      );
    }

    const persisted = await repository.record({
      dossierId,
      providerSubmissionId,
      providerSubmitterId,
      providerSubmitterSlug: slug,
      signerEmail: signingContext.signerEmail,
    });
    if (!persisted) {
      return NextResponse.json(
        { provider: "docuseal", error: "submission_persistence_failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      provider: "docuseal",
      submissionId: providerSubmissionId,
      url,
    });
  } catch {
    return NextResponse.json(
      { provider: "docuseal", error: "network_error" },
      { status: 502 },
    );
  }
}
