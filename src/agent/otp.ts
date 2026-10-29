// ─────────────────────────────────────────────────────────────
// OTP: find a customer, send a code, check a code
// Normal backend code. No AI here.
// ─────────────────────────────────────────────────────────────
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { pool } from "../db.js";
import { sendSms } from "./sms.js";

export type Customer = {
  id: string;
  name: string;
  phone: string;
};

export type CheckResult = { ok: true } | { ok: false; reason: string };

// Hash a code with a secret key, so stolen hashes can't be reversed
function hashCode(code: string): string {
  return createHmac("sha256", config.otpSecret).update(code).digest("hex");
}

// ── Find a customer by phone ─────────────────────────────────
export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const result = await pool.query<Customer>(
    "SELECT id, name, phone FROM customers WHERE phone = $1",
    [phone],
  );
  return result.rows[0] ?? null;
}

// ── Create a code, save its HASH, "send" it by SMS ───────────
// Returns NOTHING on purpose: the code must never reach the AI.
export async function sendCode(customer: Customer): Promise<void> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0"); // e.g. "048213"

  // Old unused codes stop working
  await pool.query(
    "UPDATE otp_codes SET used = true WHERE customer_id = $1 AND used = false",
    [customer.id],
  );

  // Save the new code's hash, valid for a few minutes
  await pool.query(
    `INSERT INTO otp_codes (customer_id, code_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(mins => $3))`,
    [customer.id, hashCode(code), config.otpMinutes],
  );

  // Send it by SMS (pretend provider — see sms.ts)
  sendSms(customer.phone, `Your verification code is ${code}. It expires in ${config.otpMinutes} minutes.`);
}

// ── Check the code the customer typed ────────────────────────
type CodeRow = { id: number; code_hash: string; expired: boolean; attempts: number };

export async function checkCode(customerId: string, code: string): Promise<CheckResult> {
  // The newest unused code for this customer
  const result = await pool.query<CodeRow>(
    `SELECT id, code_hash, expires_at < now() AS expired, attempts
     FROM otp_codes
     WHERE customer_id = $1 AND used = false
     ORDER BY created_at DESC
     LIMIT 1`,
    [customerId],
  );
  const row = result.rows[0];

  if (!row) return { ok: false, reason: "No active code. Please request a new one." };
  if (row.expired) return { ok: false, reason: "The code has expired. Please request a new one." };
  if (row.attempts >= config.otpMaxAttempts) {
    return { ok: false, reason: "Too many wrong attempts. Please request a new code." };
  }

  // Compare safely (same time for right and wrong codes)
  const isMatch = timingSafeEqual(Buffer.from(hashCode(code.trim())), Buffer.from(row.code_hash));

  if (!isMatch) {
    await pool.query("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1", [row.id]);
    const left = config.otpMaxAttempts - row.attempts - 1;
    return { ok: false, reason: `Wrong code. ${left} attempt(s) left.` };
  }

  // Correct: the code can never be used again
  await pool.query("UPDATE otp_codes SET used = true WHERE id = $1", [row.id]);
  return { ok: true };
}
