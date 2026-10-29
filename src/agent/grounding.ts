// ─────────────────────────────────────────────────────────────
// GROUNDING CHECKS: did the CUSTOMER really say this?
//
// The AI fills in tool arguments. Small models sometimes INVENT them
// (a code "123456", a month nobody asked for). These checks compare
// the AI's argument with what the customer actually typed.
// ─────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

// Is this exact 6-digit code in the customer's LAST message?
// "\b\d{6}\b" = exactly 6 digits on their own, so "03001234567" doesn't count.
export function userTypedCode(lastMessage: string, code: string): boolean {
  const codes: string[] = lastMessage.match(/\b\d{6}\b/g) ?? [];
  return codes.includes(code);
}

// Did the customer mention this month anywhere in the chat?
// month = "2026-09" → accepts "2026-09", "september" or "sep"
export function userMentionedMonth(messages: string[], month: string): boolean {
  const monthNumber = Number(month.slice(5, 7));
  const name = MONTH_NAMES[monthNumber - 1];
  if (!name) return false;

  const text = messages.join(" ").toLowerCase();
  const pattern = new RegExp(`\\b(${month}|${name}|${name.slice(0, 3)})\\b`);
  return pattern.test(text);
}
