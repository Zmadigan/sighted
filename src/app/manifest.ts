import type { MetadataRoute } from "next";

// Lets people "Add to Home Screen" so Sighted opens full-screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sighted: your wildlife journal",
    short_name: "Sighted",
    description: "Snap a photo of any animal. Get an instant ID. Build your lifelong wildlife journal.",
    start_url: "/friends",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf8f2",
    theme_color: "#2c4e2c",
    categories: ["lifestyle", "education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
