import { getCachedVisaBulletinData } from "@/lib/official-data";
import { jsonWithCache } from "@/lib/api-cache";

export async function GET() {
  try {
    const payload = await getCachedVisaBulletinData();
    return jsonWithCache(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load visa bulletin.";
    return Response.json({ error: message }, { status: 500 });
  }
}
