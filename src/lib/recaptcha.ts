const SCORE_THRESHOLD = 0.5;

export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error("RECAPTCHA_SECRET_KEY is not set");
    return false;
  }

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await res.json();

    // v3 returns: { success: true, score: 0.9, action: "login", ... }
    if (data.success !== true) {
      console.error("reCAPTCHA verification failed:", data);
      return false;
    }

    if (typeof data.score === "number" && data.score < SCORE_THRESHOLD) {
      console.warn(`reCAPTCHA score too low: ${data.score} (threshold: ${SCORE_THRESHOLD})`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return false;
  }
}
