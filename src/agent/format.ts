// ─────────────────────────────────────────────────────────────
// FORMAT MONEY for statements
// "-4500.00" → { type: "DEBIT", amount: "PKR 4,500.00" }
// Works on the text directly, so no rounding errors.
// ─────────────────────────────────────────────────────────────

export function formatAmount(amount: string): { type: "DEBIT" | "CREDIT"; amount: string } {
  const isDebit = amount.startsWith("-");
  const digits = isDebit ? amount.slice(1) : amount; // "4500.00"
  const [whole = "0", cents = "00"] = digits.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ","); // "4,500"

  return {
    type: isDebit ? "DEBIT" : "CREDIT",
    amount: `PKR ${withCommas}.${cents}`,
  };
}
