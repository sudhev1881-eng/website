import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/api/uploads/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "4000", pathname: "/api/uploads/**" },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
