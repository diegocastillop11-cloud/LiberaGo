import { Client } from "@upstash/qstash";

const token = process.env.QSTASH_TOKEN;

export const qstashConfigured = Boolean(token);

const client = token ? new Client({ token }) : null;

export async function scheduleAdvanceOffer(
  baseUrl: string,
  requestId: string,
  expectedWorkerId: string,
  delaySeconds: number,
) {
  if (!client) return;
  await client.publishJSON({
    url: `${baseUrl}/api/webhooks/advance-offer`,
    body: { requestId, expectedWorkerId },
    delay: delaySeconds,
  });
}
