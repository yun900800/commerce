"use client";

import { useRef, useEffect, useCallback } from "react";

// Google reCAPTCHA v2
// Site key is public and safe to embed in client code
const SITE_KEY = "6Lf8c0wtAAAAAPu4KtKXwWol5u68yE9edmeuzI5z";

interface ReCaptchaProps {
  onVerify: (token: string | null) => void;
}

declare global {
  interface Window {
    grecaptcha?: {
      render?: (container: HTMLElement | string, options: {
        sitekey: string;
        callback: (token: string) => void;
        "expired-callback"?: () => void;
      }) => number;
      reset?: (widgetId?: number) => void;
      getResponse?: (widgetId?: number) => string;
    };
    onReCaptchaLoad?: () => void;
  }
}

export default function ReCaptcha({ onVerify }: ReCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const scriptLoaded = useRef(false);

  const handleVerify = useCallback(
    (token: string) => {
      onVerify(token);
    },
    [onVerify]
  );

  const handleExpired = useCallback(() => {
    onVerify(null);
    if (widgetId.current !== null && window.grecaptcha?.reset) {
      window.grecaptcha.reset(widgetId.current);
    }
  }, [onVerify]);

  useEffect(() => {
    function renderCaptcha() {
      if (!containerRef.current || !window.grecaptcha?.render) return;
      widgetId.current = window.grecaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: handleVerify,
        "expired-callback": handleExpired,
      });
    }

    if (typeof window.grecaptcha !== "undefined" && typeof window.grecaptcha.render === "function") {
      renderCaptcha();
      return;
    }

    // Load the script once
    if (!scriptLoaded.current) {
      scriptLoaded.current = true;
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?onload=onReCaptchaLoad&render=explicit";
      script.async = true;
      script.defer = true;

      window.onReCaptchaLoad = () => {
        renderCaptcha();
      };

      document.head.appendChild(script);
    }

    return () => {
      // Cleanup
      window.onReCaptchaLoad = undefined;
    };
  }, [handleVerify, handleExpired]);

  return <div ref={containerRef} />;
}
