import type { NextConfig } from "next";

const dataGlob = ["./data/**/*"];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/": dataGlob,
    "/api/me": dataGlob,
    "/api/status": dataGlob,
    "/api/portfolio": dataGlob,
    "/api/briefing": dataGlob,
    "/api/projects": dataGlob,
    "/api/projects/[code]": dataGlob,
    "/api/projects/[code]/history": dataGlob,
    "/api/risks": dataGlob,
    "/api/money": dataGlob,
    "/api/people/load": dataGlob,
  },
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
