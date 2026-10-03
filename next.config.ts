import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ads-partners.coupang.com",
      },
    ],
  },
};

export default nextConfig;
