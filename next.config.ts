import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";
const config: NextConfig = {
  poweredByHeader: false,
  experimental: { globalNotFound: true },
  images: {
    // Authentication-bearing media is deliberately absent from this allowlist.
    localPatterns: [
      { pathname: "/images/artworks/**" },
      { pathname: "/images/backgrounds/**" },
      { pathname: "/images/megumin/!(pet-collapse).webp" },
      { pathname: "/api/media/file/*" },
    ],
    remotePatterns: [],
    maximumRedirects: 0,
    dangerouslyAllowLocalIP: false,
    qualities: [75],
  },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] }, ...["/api/login", "/login", "/account", "/api/private-notes/:path*", "/api/private-media/:path*", "/api/members/:path*", "/my-notes/:path*", "/member-notes/:path*"].map(source => ({ source, headers: [
      { key: "Cache-Control", value: "private, no-store" }, { key: "CDN-Cache-Control", value: "no-store" }, { key: "Vercel-CDN-Cache-Control", value: "no-store" },
    ] }))];
  },
};
export default withPayload(config);
