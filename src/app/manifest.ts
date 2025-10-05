import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OnTime - Inteligentna nawigacja miejska w czasie rzeczywistym",
    short_name: "OnTime",
    description:
      "OnTime to aplikacja PWA do śledzenia transportu publicznego w czasie rzeczywistym. Otrzymuj alerty o opóźnieniach, planuj trasy autobusem, tramwajem i pociągiem. Zawsze na czas!",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    background_color: "#ffffff",
    theme_color: "#0066FF",
    orientation: "portrait-primary",
    lang: "pl",
    dir: "ltr",
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
    categories: ["travel", "utilities", "navigation", "productivity"],
    screenshots: [
      {
        src: "/screenshot-mobile.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: "Mapa z alertami w czasie rzeczywistym",
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
        url: "/pwa",
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
