import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OnTime",
    short_name: "OnTime",
    description: "OnTime - No more waiting, just on-time arrivals!",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    background_color: "#ffffff",
    theme_color: "#0066FF",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["communication", "travel", "utilities"],
    screenshots: [
      {
        src: "/screenshot-mobile.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
      },
    ],
    shortcuts: [
      {
        name: "View Map",
        short_name: "Map",
        description: "View real-time map with alerts",
        url: "/",
        icons: [
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
          },
        ],
      },
      {
        name: "My Alerts",
        short_name: "Alerts",
        description: "View your alerts",
        url: "/alerts",
        icons: [
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
          },
        ],
      },
    ],
    prefer_related_applications: false,
    related_applications: [],
  };
}
