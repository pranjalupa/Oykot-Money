import type { MetadataRoute } from "next";

/**
 * What makes the site installable — "Add to Home Screen" on iPhone, the
 * Install button in Chrome, and the base for the store builds later.
 *
 * `display: standalone` is what drops the browser chrome; the safe-area
 * padding already in the nav only takes effect once that happens (and once
 * the viewport opts into `viewport-fit: cover`, in layout.tsx).
 *
 * Colours are the token values from globals.css, written out because a
 * manifest can't read CSS variables. Keep them in step with
 * `--background` (light) and Forest 900.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oykot Money",
    short_name: "Oykot",
    description: "Budget your needs, wants and investments, and see where the month actually went.",
    start_url: "/",
    id: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f7f7",
    theme_color: "#004437",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops icons to its own shape; the maskable one has the padding for it.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add a transaction", short_name: "Add", url: "/?add=1" },
      { name: "This month", short_name: "Month", url: "/?view=monthly" },
      { name: "Money", short_name: "Money", url: "/money" },
    ],
  };
}
