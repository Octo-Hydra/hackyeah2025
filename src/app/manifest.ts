import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OnTime",
    short_name: "OnTime",
    description: "OnTime - Koniec z czekaniem, zawsze na czas!",
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
        name: "Zobacz mapę",
        short_name: "Mapa",
        description: "Zobacz mapę na żywo z alertami",
        url: "/",
        icons: [
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
          },
        ],
      },
      {
        name: "Moje alerty",
        short_name: "Alerty",
        description: "Zobacz swoje alerty",
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
