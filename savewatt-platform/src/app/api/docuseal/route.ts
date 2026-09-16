import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

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
  const { userId } = await auth();
  const demoMode = process.env.NEXT_PUBLIC_SAVEWATT_DEMO_MODE === "true";
  if (!userId && !demoMode) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const email: string | undefined = body?.email;
  const clientName: string | undefined = body?.clientName;
  const dossierId: string | undefined = body?.dossierId;

  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !clientName || !dossierId) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const base = process.env.DOCUSEAL_BASE_URL;
  const token = process.env.DOCUSEAL_API_TOKEN;
  const templateId = process.env.DOCUSEAL_TEMPLATE_ID;
  const signBase = process.env.DOCUSEAL_SIGN_URL ?? "https://docuseal.com";

  // Mock mode — no DocuSeal configured.
  if (!base || !token || !templateId) {
    return NextResponse.json({
      provider: "mock",
      submissionId: `mock_${Date.now()}`,
      url: `${signBase}/s/demo-${encodeURIComponent(clientName ?? "client")}`,
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
            email,
            name: clientName,
            external_id: dossierId,
            require_email_2fa: true,
            metadata: { dossierId, initiatedBy: userId ?? "demo" },
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { provider: "docuseal", error: "docuseal_error", detail },
        { status: 502 },
      );
    }

    const data = await res.json();
    const submitter = Array.isArray(data) ? data[0] : data?.submitters?.[0] ?? data;
    const slug = submitter?.slug;
    const url = submitter?.embed_src ?? (slug ? `${signBase}/s/${slug}` : signBase);

    return NextResponse.json({
      provider: "docuseal",
      submissionId: String(submitter?.submission_id ?? submitter?.id ?? slug ?? Date.now()),
      url,
    });
  } catch (e) {
    return NextResponse.json(
      { provider: "docuseal", error: "network_error", detail: String(e) },
      { status: 502 },
    );
  }
}
