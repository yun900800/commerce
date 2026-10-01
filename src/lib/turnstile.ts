// Cloudflare Turnstile — server-side token verification.
//
// Contrast with lib/recaptcha.ts: reCAPTCHA v3 returns a 0–1 `score` that callers
// threshold. Turnstile has NO score at all — the only verdict is `success`. Do not
// reintroduce a numeric threshold here; there is nothing to threshold.

const SITEVERIFY_ENDPOINT =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 10_000;
/** Turnstile tokens are capped at 2048 characters — anything longer is forged. */
const MAX_TOKEN_LENGTH = 2048;
/**
 * Binds a token to the one surface it was minted for. The value is echoed back by
 * Cloudflare, so it is replay-scoping rather than proof of intent — a token lifted
 * from another form cannot be spent here.
 */
const EXPECTED_ACTION = "create-product";

interface SiteVerifyResult {
  success: boolean;
  "error-codes"?: string[];
  action?: string;
  hostname?: string;
}

function isPlausibleToken(token: unknown): token is string {
  return (
    typeof token === "string" &&
    token.length > 0 &&
    token.length <= MAX_TOKEN_LENGTH
  );
}

async function requestSiteVerify(
  secretKey: string,
  token: string
): Promise<SiteVerifyResult> {
  const res = await fetch(SITEVERIFY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    body: new URLSearchParams({ secret: secretKey, response: token }),
  });

  if (!res.ok) {
    throw new Error(`siteverify responded ${res.status}`);
  }

  return (await res.json()) as SiteVerifyResult;
}

export async function verifyTurnstile(token: unknown): Promise<boolean> {
  // Pre-flight: reject malformed input before spending a network round-trip.
  if (!isPlausibleToken(token)) {
    console.warn("Turnstile verification failed: missing or malformed token");
    return false;
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY is not set");
    return false;
  }

  let result: SiteVerifyResult;
  try {
    result = await requestSiteVerify(secretKey, token);
  } catch (error) {
    // Fail closed: an unreachable verifier must never become a bypass.
    console.error("Turnstile verification error:", error);
    return false;
  }

  if (result.success !== true) {
    console.warn(
      `Turnstile rejected the token: ${result["error-codes"]?.join(", ") ?? "unknown"}`
    );
    return false;
  }

  if (result.action !== EXPECTED_ACTION) {
    console.warn(
      `Turnstile action mismatch: expected ${EXPECTED_ACTION}, got ${result.action}`
    );
    return false;
  }

  return true;
}