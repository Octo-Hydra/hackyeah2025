import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/auth/signin", "/auth/signup"],
        disallow: [
          "/api/",
          "/auth/verify-email",
          "/auth/reset-password",
          "/user",
          "/alerts",
          "/admin",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/auth/signin", "/auth/signup"],
        disallow: [
          "/api/",
          "/auth/verify-email",
          "/auth/reset-password",
          "/user",
          "/alerts",
          "/admin",
        ],
        crawlDelay: 1,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
