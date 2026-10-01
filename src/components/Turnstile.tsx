"use client";

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";

// Cloudflare Turnstile site key. Public by design — it ships to the browser and is
// useless without the matching secret, which stays server-side in
// TURNSTILE_SECRET_KEY. Do NOT move the secret key into this file.
const SITE_KEY = "0x4AAAAAAFKszgvFo1NnBkgV";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js";

/** Must match EXPECTED_ACTION in lib/turnstile.ts. */
const WIDGET_ACTION = "create-product";

export interface TurnstileHandle {
  /** Current token, or null while unsolved / expired. */
  getToken: () => string | null;
  /**
   * Discards the spent token and re-arms the widget. Turnstile tokens are
   * single-use, so every submission must reset — otherwise the next attempt is
   * rejected with `timeout-or-duplicate`.
   */
  reset: () => void;
}

interface TurnstileProps {
  /** Fires with the current token, or null when the widget expires or errors. */
  onTokenChange?: (token: string | null) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

// Module-level: load api.js at most once per page load, shared across instances.
// Loading is deferred to mount so /auth never requests challenges.cloudflare.com.
let scriptReady: Promise<void> | undefined;
function ensureScriptLoaded(): Promise<void> {
  if (!scriptReady) {
    scriptReady = new Promise((resolve, reject) => {
      if (typeof window.turnstile?.render === "function") {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // Allow a later mount to retry rather than caching the failure forever.
        scriptReady = undefined;
        reject(new Error("Failed to load the Turnstile script"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptReady;
}

const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(function Turnstile(
  { onTokenChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  // Keep the latest callback reachable from the widget's closures without
  // re-running the effect (which would remount the widget).
  const onTokenChangeRef = useRef(onTokenChange);
  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  function publishToken(token: string | null) {
    tokenRef.current = token;
    onTokenChangeRef.current?.(token);
  }

  useEffect(() => {
    let cancelled = false;

    ensureScriptLoaded()
      .then(() => {
        // Guard against React StrictMode's double effect and against a second
        // instance racing us: only the first caller may render a widget.
        if (cancelled || widgetIdRef.current !== null || !containerRef.current) {
          return;
        }
        widgetIdRef.current = window.turnstile!.render(containerRef.current, {
          sitekey: SITE_KEY,
          action: WIDGET_ACTION,
          theme: "light",
          callback: (token: string) => publishToken(token),
          "expired-callback": () => publishToken(null),
          "error-callback": () => publishToken(null),
        });
      })
      .catch((error) => console.error(error));

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    getToken: () => tokenRef.current,
    reset: () => {
      publishToken(null);
      if (widgetIdRef.current !== null) {
        window.turnstile?.reset(widgetIdRef.current);
      }
    },
  }));

  // The Managed widget renders Cloudflare's own visible checkbox inside this node.
  return <div ref={containerRef} />;
});

export default Turnstile;