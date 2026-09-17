import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained Node server in .next/standalone — the versioned release
  // artifact produced by CI (lab section 7.3).
  output: "standalone",
};

export default nextConfig;
