// ─────────────────────────────────────────────────────────────
// PRETEND SMS PROVIDER (for the demo)
// A real app would call an SMS API here (e.g. Twilio, Jazz, Telenor).
// Messages are kept in memory so the web page can show a "demo phone".
// The AI never sees this — it's a separate channel, like a real phone.
// ─────────────────────────────────────────────────────────────

export type Sms = { to: string; text: string; sentAt: string };

const outbox: Sms[] = [];

export function sendSms(to: string, text: string): void {
  outbox.push({ to, text, sentAt: new Date().toISOString() });
  console.log(`📱 [SMS to ${to}] ${text}`);
}

// The latest messages (newest last)
export function latestSms(limit = 5): Sms[] {
  return outbox.slice(-limit);
}
