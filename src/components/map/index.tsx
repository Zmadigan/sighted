"use client";

import dynamic from "next/dynamic";

// Leaflet only works in the browser, so these maps skip server rendering.
const loading = () => <div className="h-64 w-full animate-pulse rounded-xl bg-forest-50" />;

export const LocationPicker = dynamic(() => import("./LocationPickerInner"), { ssr: false, loading });
export const SightingsMap = dynamic(() => import("./SightingsMapInner"), { ssr: false, loading });
