"use client";

import { useRef, useImperativeHandle, forwardRef } from "react";

// Google reCAPTCHA v3 — invisible, no checkbox
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

const ReCaptcha = forwardRef<ReCaptchaHandle, object>(function ReCaptcha(_props: object, ref) {
  const ready = useRef<Promise<void> | undefined>(undefined);

  useImperativeHandle(ref, () => ({
    async execute(action: string): Promise<string> {
      // Lazily load the script on first call
      if (!ready.current) {
        ready.current = new Promise((resolve) => {
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

      await ready.current;
      return window.grecaptcha!.execute(SITE_KEY, { action });
    },
  }));

  // v3 has no visible UI
  return null;
});

export default ReCaptcha;
