import { CIRCUIT_BREAKER_FAILURE_THRESHOLD } from "@/lib/ingestion/constants";

export async function sendIngestionAlert(message: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  const alertEmail = process.env.ALERT_EMAIL;
  const fromEmail = process.env.ALERT_FROM_EMAIL ?? "alerts@immimap.local";

  if (!resendKey || !alertEmail) {
    console.error("[ingestion-alert]", message);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [alertEmail],
      subject: "ImmiMap data ingestion circuit breaker triggered",
      text: message,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[ingestion-alert] Resend failed:", body);
  }
}

export async function maybeTriggerCircuitBreakerAlert(
  consecutiveFailures: number,
  lastError: string,
): Promise<void> {
  if (consecutiveFailures < CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
    return;
  }

  await sendIngestionAlert(
    [
      "The ImmiMap official data ingestion job has failed 3 or more times in a row.",
      `Consecutive failures: ${consecutiveFailures}`,
      `Last error: ${lastError}`,
      "Please inspect /admin/sync and Supabase data_ingestion_log.",
    ].join("\n"),
  );
}
