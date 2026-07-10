import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scryptSync, timingSafeEqual } from "crypto";
import { verifyRecaptcha } from "@/lib/recaptcha";

function verifyPassword(password: string, hashed: string): boolean {
  const [salt, key] = hashed.split(":");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  // Constant-time comparison to prevent timing attacks
  const buf1 = Buffer.from(key);
  const buf2 = Buffer.from(derivedKey);
  if (buf1.length !== buf2.length) return false;
  return timingSafeEqual(buf1, buf2);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, recaptchaToken } = body;

    // ── reCAPTCHA verification ──────────────────────────────
    if (!recaptchaToken || !(await verifyRecaptcha(recaptchaToken))) {
      return NextResponse.json(
        { error: "reCAPTCHA verification failed. Please try again." },
        { status: 400 }
      );
    }

    // ── Validation ──────────────────────────────────────────
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // ── Look up user ────────────────────────────────────────
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .get();

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // ── Verify password ─────────────────────────────────────
    const isValid = verifyPassword(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // ── Set session cookie ──────────────────────────────────
    const sessionData = JSON.stringify({
      userId: user.id,
      name: user.name,
      email: user.email,
    });

    const response = NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    response.cookies.set("session", Buffer.from(sessionData).toString("base64"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
