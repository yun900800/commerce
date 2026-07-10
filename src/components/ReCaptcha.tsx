"use client";

import { useEffect, useRef } from "react";

// Google reCAPTCHA v3 — invisible, no checkbox
const SITE_KEY = "6Lf8c0wtAAAAAPu4KtKXwWol5u68yE9edmeuzI5z";

interface ReCaptchaProps {
  action: string;
  onToken: (token: string) => void;
}

declare global {
  interface Window {
    grecaptcha?: {
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      ready: (callback: () => void) => void;
    };
  }
}

export default function ReCaptcha({ action, onToken }: ReCaptchaProps) {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    function execute() {
      if (!window.grecaptcha) return;
      window.grecaptcha.ready(async () => {
        const token = await window.grecaptcha!.execute(SITE_KEY, { action });
        onToken(token);
      });
    }

    if (typeof window.grecaptcha !== "undefined" && typeof window.grecaptcha.execute === "function") {
      execute();
      return;
    }

    if (!scriptLoaded.current) {
      scriptLoaded.current = true;
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = execute;
      document.head.appendChild(script);
    }

    // Re-execute every 100 seconds (tokens expire after 120s)
    const interval = setInterval(execute, 100_000);
    return () => clearInterval(interval);
  }, [action, onToken]);

  // v3 has no visible UI
  return null;
}
