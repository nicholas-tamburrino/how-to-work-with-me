/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const baseHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.vercel.app https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
          "style-src 'self' 'unsafe-inline' https://*.clerk.vercel.app https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data: https://*.clerk.vercel.app https://*.clerk.com https://*.clerk.accounts.dev",
          "connect-src 'self' https://*.clerk.vercel.app https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://*.supabase.co wss://*.supabase.co",
          "worker-src 'self' blob:",
          "frame-src https://*.clerk.vercel.app https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      },
    ];
    if (isProd) {
      baseHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }
    return [{ source: "/(.*)", headers: baseHeaders }];
  },
};

module.exports = nextConfig;
