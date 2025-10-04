import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "OnTime - Inteligentna nawigacja miejska w czasie rzeczywistym";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0066FF 0%, #0047B3 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Background Pattern */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
            padding: "20px",
          }}
        >
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                border: "3px solid white",
                opacity: Math.random() * 0.5 + 0.3,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            zIndex: 1,
            padding: "0 100px",
          }}
        >
          {/* Logo/Icon */}
          <div
            style={{
              width: "180px",
              height: "180px",
              borderRadius: "40px",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "40px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                fontSize: "100px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              🚌
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "80px",
              fontWeight: "bold",
              color: "white",
              marginBottom: "20px",
              letterSpacing: "-2px",
              textShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            OnTime
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: "38px",
              color: "rgba(255,255,255,0.95)",
              maxWidth: "900px",
              lineHeight: 1.4,
              textShadow: "0 2px 10px rgba(0,0,0,0.2)",
            }}
          >
            Inteligentna nawigacja miejska w czasie rzeczywistym
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: "32px",
              color: "rgba(255,255,255,0.85)",
              marginTop: "30px",
              fontWeight: 500,
              textShadow: "0 2px 10px rgba(0,0,0,0.2)",
            }}
          >
            Koniec z czekaniem, zawsze na czas!
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            fontSize: "24px",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          <span>🚌 Autobusy</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span>🚊 Tramwaje</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span>🚆 Pociągi</span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
