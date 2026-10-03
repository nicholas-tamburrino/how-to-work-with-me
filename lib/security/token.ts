import { randomBytes, createHash } from "crypto";

const TOKEN_BYTES = 32;

/**
 * Generate a cryptographically random token (32+ bytes) and its SHA-256 hash.
 * DB stores ONLY token_hash; the raw token is returned once to the user for the share URL.
 * Never store or log the raw token.
 */
export function generateShareToken(): { token: string; tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}
