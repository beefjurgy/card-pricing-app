import type { NextConfig } from "next";

// Derived from the same env var used everywhere else, so there's a single
// source of truth instead of hardcoding the R2 host twice.
const r2Hostname = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.246", "10.1.10.168", "10.1.10.241", "192.168.1.83"],
  images: {
    remotePatterns: r2Hostname ? [{ protocol: "https", hostname: r2Hostname }] : [],
  },
};

export default nextConfig;
