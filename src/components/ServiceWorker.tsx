"use client";

import { useEffect } from "react";

/** Registers /sw.js in production so the app works with weak or no signal. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error) => console.error("Service worker failed", error));
  }, []);
  return null;
}
