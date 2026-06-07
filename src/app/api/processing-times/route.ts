import { getCachedProcessingTimesData } from "@/lib/official-data";
import { jsonWithCache } from "@/lib/api-cache";

export async function GET() {
  try {
    const payload = await getCachedProcessingTimesData();
    return jsonWithCache(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load processing times.";
    return Response.json({ error: message }, { status: 500 });
  }
}
