import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/preview/"] }, sitemap: `${process.env.SITE_URL || "https://muruiwen.cn"}/sitemap.xml` }; }
