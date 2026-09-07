import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The administrator sign-in moved from /login to /admin/login when the home
   * page became the partner sign-in. Kept as a redirect so existing bookmarks
   * still land somewhere useful. Not permanent: a 308 would be cached in
   * browsers long after anyone cared.
   */
  async redirects() {
    return [{ source: "/login", destination: "/admin/login", permanent: false }];
  },

  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
