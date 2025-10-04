import Script from "next/script";

export function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "OnTime",
    applicationCategory: "TravelApplication",
    operatingSystem: "Web, iOS, Android",
    description:
      "OnTime to aplikacja PWA do śledzenia transportu publicznego w czasie rzeczywistym. Otrzymuj alerty o opóźnieniach, planuj trasy autobusem, tramwajem i pociągiem.",
    author: {
      "@type": "Organization",
      name: "Hydra Tech",
      url: "https://github.com/Octo-Hydra",
    },
    featureList: [
      "Śledzenie transportu publicznego w czasie rzeczywistym",
      "Alerty o opóźnieniach i zmianach",
      "Planowanie optymalnych tras",
      "Obsługa autobusów, tramwajów i pociągów",
      "Działanie offline (PWA)",
      "Powiadomienia push",
    ],
    screenshot: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/screenshot-mobile.png`,
    softwareVersion: "1.0.0",
    releaseNotes: "Pierwsza wersja aplikacji OnTime",
    inLanguage: "pl",
  };

  return (
    <Script
      id="json-ld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
