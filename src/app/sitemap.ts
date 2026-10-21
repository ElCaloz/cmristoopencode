import type { MetadataRoute } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

const routes: Array<{ path: string; priority: number }> = [
  { path: "", priority: 1 },
  { path: "/funzionalita", priority: 0.9 },
  { path: "/prezzi", priority: 0.9 },
  { path: "/documentazione", priority: 0.6 },
  { path: "/contatti", priority: 0.5 },
  { path: "/privacy", priority: 0.3 },
  { path: "/cookie", priority: 0.3 },
  { path: "/termini", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map(({ path, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority,
  }));
}
