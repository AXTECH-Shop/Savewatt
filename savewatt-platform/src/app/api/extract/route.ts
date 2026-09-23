import { NextResponse } from "next/server";
import { extractBill } from "@/lib/extraction/gemini";
import { resolveServerActor, WorkspaceAccessError } from "@/lib/server-access";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export async function POST(request: Request) {
  try {
    await resolveServerActor();
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    throw error;
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "UNSUPPORTED_TYPE", allowed: ALLOWED },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE", maxBytes: MAX_BYTES }, { status: 413 });
  }

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    const result = await extractBill({ data, mimeType: file.type });
    return NextResponse.json(result);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "EXTRACTION_FAILED", detail }, { status: 502 });
  }
}
