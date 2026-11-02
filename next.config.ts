import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Photos are resized in the browser before upload, but leave headroom.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
