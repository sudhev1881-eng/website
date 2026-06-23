import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
