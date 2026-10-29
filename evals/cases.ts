// ─────────────────────────────────────────────────────────────
// THE EXAM: questions + what a correct answer must contain
// ─────────────────────────────────────────────────────────────

export type EvalCase = {
  question: string;
  expectedSource?: string; // which file search should find
  mustContainAny?: string[]; // answer must contain at least one of these
  expectRefusal?: boolean; // answer should be "I don't know"
};

export const cases: EvalCase[] = [
  // Refunds
  { question: "How long do card refunds take?", expectedSource: "refunds.md", mustContainAny: ["5 to 7", "5-7"] },
  { question: "Can I get a refund after 20 days?", expectedSource: "refunds.md", mustContainAny: ["14"] },
  { question: "Can I refund a transaction that is under dispute?", expectedSource: "refunds.md", mustContainAny: ["dispute"] },
  { question: "Can the refund go to a different card?", expectedSource: "refunds.md", mustContainAny: ["original"] },
  { question: "Are partial refunds allowed?", expectedSource: "refunds.md", mustContainAny: ["partial"] },
  { question: "How fast is a JazzCash refund?", expectedSource: "refunds.md", mustContainAny: ["24", "instant"] },

  // Settlements
  { question: "When do merchants receive their money?", expectedSource: "settlements.md", mustContainAny: ["next business day", "T+1"] },
  { question: "Why is my merchant payout stuck?", expectedSource: "settlements.md", mustContainAny: ["KYC"] },
  { question: "When are Friday transactions settled?", expectedSource: "settlements.md", mustContainAny: ["Monday"] },

  // API security
  { question: "What happens if I send the same payment request twice?", expectedSource: "api-security.md", mustContainAny: ["idempotency", "charged twice", "charged again", "original response"] },
  { question: "How many API requests can I send per second?", expectedSource: "api-security.md", mustContainAny: ["100"] },
  { question: "Which header holds the request signature?", expectedSource: "api-security.md", mustContainAny: ["X-Signature"] },

  // Not in the documents → must refuse
  { question: "Do you support crypto payments?", expectRefusal: true },
  { question: "What is the weather in Karachi today?", expectRefusal: true },
  { question: "Can you give me a loan?", expectRefusal: true },
];
