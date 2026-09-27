import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { actionSchema, DomainError, seed } from "@/lib/domain";
import { mode, mutateState, readState } from "@/lib/repository";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function session(req: NextRequest) {
  const value = req.cookies.get("hb-demo")?.value;
  return value && /^[a-f0-9-]{36}$/.test(value) ? value : randomUUID();
}
export async function GET(req: NextRequest) {
  try {
    const id = session(req);
    const response = NextResponse.json(
      {
        mode: mode(),
        state: mode() === "mongo" ? await readState(id) : seed(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set("hb-demo", id, {
      httpOnly: true,
      sameSite: "strict",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 7 * 86400,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Chưa kết nối được dữ liệu. Bạn có thể thử lại." },
      { status: 503 },
    );
  }
}
export async function POST(req: NextRequest) {
  // Next.js may normalize nextUrl to localhost; compare the browser origin
  // with the actual incoming Host, including its port.
  let sameHost = false;
  try {
    const origin = new URL(req.headers.get("origin") || "");
    sameHost =
      ["http:", "https:"].includes(origin.protocol) &&
      origin.host === req.headers.get("host");
  } catch {
    /* Missing or invalid origin. */
  }
  if (!sameHost)
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ." },
      { status: 403 },
    );
  if (mode() !== "mongo")
    return NextResponse.json(
      { error: "Phiên trải nghiệm này lưu trên thiết bị." },
      { status: 400 },
    );
  try {
    const parsed = z
      .object({
        action: actionSchema,
        revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      })
      .strict()
      .safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Thông tin chưa hợp lệ." },
        { status: 400 },
      );
    return NextResponse.json({
      state: await mutateState(
        session(req),
        parsed.data.action,
        parsed.data.revision,
      ),
    });
  } catch (error) {
    if (error instanceof DomainError)
      return NextResponse.json({ error: error.message }, { status: 422 });
    if (error instanceof SyntaxError)
      return NextResponse.json(
        { error: "Thông tin chưa hợp lệ." },
        { status: 400 },
      );
    if (error instanceof Error && error.message === "CONFLICT")
      return NextResponse.json(
        { error: "Dữ liệu vừa thay đổi ở một cửa sổ khác. Hãy tải lại trang." },
        { status: 409 },
      );
    return NextResponse.json(
      { error: "Chưa lưu được thay đổi. Hãy thử lại." },
      { status: 503 },
    );
  }
}
