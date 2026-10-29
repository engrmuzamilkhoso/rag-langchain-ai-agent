// ─────────────────────────────────────────────────────────────
// SESSION: who is talking, and are they verified?
// Lives in CODE. The AI can never change it by "saying" something.
//
//   anonymous  →  pending (code sent)  →  verified ✅
// ─────────────────────────────────────────────────────────────
import type { Customer } from "./otp.js";

export type Session = {
  pendingCustomer: Customer | null; // phone found + code sent, waiting for the code
  verifiedCustomer: Customer | null; // typed the correct code
  userMessages: string[]; // what the CUSTOMER really typed (tools check AI arguments against this)
};

export function createSession(): Session {
  return {
    pendingCustomer: null,
    verifiedCustomer: null,
    userMessages: [],
  };
}
