import { database, mode } from "@/lib/repository";
export async function GET() {
  try {
    if (mode() === "mongo") await (await database()).command({ ping: 1 });
    return Response.json({ status: "ok", mode: mode() });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
