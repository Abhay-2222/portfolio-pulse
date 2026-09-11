import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/": ["./data/**/*"],
    "/api/portfolio": ["./data/**/*"],
  },
};

export default nextConfig;
