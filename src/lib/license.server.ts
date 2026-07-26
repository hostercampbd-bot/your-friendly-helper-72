import { randomBytes, timingSafeEqual } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars

export function generateLicenseKey(): string {
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
    if (i % 4 === 3 && i < 15) out += "-";
  }
  return out; // e.g. XXXX-XXXX-XXXX-XXXX
}

function safeEq(provided: string | null | undefined, expected: string | null | undefined): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Global fallback secret (env). */
export function verifyPluginSecret(provided: string | null): boolean {
  return safeEq(provided, process.env.PLUGIN_API_SECRET);
}

/** Accepts either the product's own API secret or the global env secret. */
export function verifyProductSecret(provided: string | null, productSecret: string | null | undefined): boolean {
  return safeEq(provided, productSecret) || verifyPluginSecret(provided);
}

export function generateApiSecret(): string {
  return randomBytes(24).toString("hex");
}
