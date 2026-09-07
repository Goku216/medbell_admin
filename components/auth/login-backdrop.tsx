"use client";

import * as React from "react";

import Waves from "@/components/reactbits/waves";

/**
 * Animated backdrop for the sign-in screen.
 *
 * The canvas needs a concrete colour string, and our palette lives in CSS
 * custom properties that `strokeStyle` cannot resolve — so the two themes are
 * spelled out here in rgba, tuned to the teal `--primary`. Low alpha on
 * purpose: this sits behind a form someone is typing into.
 */
const LINE_COLOR = {
  light: "rgba(23, 138, 150, 0.17)",
  dark: "rgba(122, 214, 224, 0.19)",
} as const;

function subscribeToTheme(onChange: () => void) {
  // next-themes toggles a class on <html>; the OS query covers "system".
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

const readTheme = () =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

/**
 * Read through useSyncExternalStore rather than an effect: the value is
 * external mutable state, so this avoids both a hydration flash and the
 * cascading render that setting it from an effect would cause.
 */
function useThemeName(): "light" | "dark" {
  return React.useSyncExternalStore(subscribeToTheme, readTheme, () => "light");
}

export function LoginBackdrop() {
  const theme = useThemeName();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Soft brand wash behind the lines, so the canvas is never the only
          thing carrying the page on a slow first paint. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,var(--color-accent)_0%,transparent_55%)] opacity-70" />

      <Waves
        lineColor={LINE_COLOR[theme]}
        backgroundColor="transparent"
        // Sparser than the upstream default: fewer polylines per frame, and a
        // calmer look for a screen someone stares at while typing a password.
        xGap={14}
        yGap={40}
        waveAmpX={26}
        waveAmpY={12}
        waveSpeedX={0.008}
        waveSpeedY={0.004}
        className="opacity-90"
      />

      {/* Fades the field out behind the card so the form always wins. */}
      <div className="absolute inset-0 bg-[radial-gradient(58%_48%_at_50%_50%,var(--color-background)_0%,transparent_100%)]" />
    </div>
  );
}
