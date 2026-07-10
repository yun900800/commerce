"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

// Google reCAPTCHA v3 — no checkbox, analyzes user behavior in background
const SITE_KEY = "6Lf8c0wtAAAAAPu4KtKXwWol5u68yE9edmeuzI5z";

export interface ReCaptchaHandle {
  execute: (action: string) => Promise<string>;
}

declare global {
  interface Window {
    grecaptcha?: {
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      ready: (callback: () => void) => void;
    };
  }
}

// Module-level: only load the script once across all instances
let scriptReady: Promise<void>;
function ensureScriptLoaded(): Promise<void> {
  if (!scriptReady) {
    scriptReady = new Promise((resolve) => {
      if (
        typeof window.grecaptcha !== "undefined" &&
        typeof window.grecaptcha.execute === "function"
      ) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = () => window.grecaptcha?.ready(resolve);
      document.head.appendChild(script);
    });
  }
  return scriptReady;
}

const ReCaptcha = forwardRef<ReCaptchaHandle, object>(function ReCaptcha(_props: object, ref) {
  // Eagerly load the Google script on mount so it can start tracking user behavior
  useEffect(() => {
    ensureScriptLoaded();
  }, []);

  useImperativeHandle(ref, () => ({
    async execute(action: string): Promise<string> {
      await ensureScriptLoaded();
      return window.grecaptcha!.execute(SITE_KEY, { action });
    },
  }));

  // v3 has no visible UI of its own — Google injects a small badge in the corner
  return null;
});

export default ReCaptcha;
