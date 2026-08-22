import { ImageResponse } from "next/og";

export const alt = "Sussy Baka Detected — AI guessing game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        color: "#f9fbf5",
        background: "#05070b",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          left: -190,
          top: -250,
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(200,255,104,.18), rgba(200,255,104,0) 68%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 760,
          height: 760,
          right: -220,
          bottom: -360,
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(255,141,216,.18), rgba(255,141,216,0) 68%)",
        }}
      />

      <div
        style={{
          width: 1040,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            border: "1px solid rgba(200,255,104,.22)",
            borderRadius: 999,
            color: "#dfff9e",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "0.14em",
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "#c8ff68" }} />
          DETECTOR ONLINE
        </div>

        <div style={{ display: "flex", fontSize: 78, fontWeight: 950, letterSpacing: "-0.065em", lineHeight: 0.94 }}>
          SUSSY BAKA
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 78,
            fontWeight: 950,
            letterSpacing: "-0.065em",
            lineHeight: 0.94,
            color: "#c8ff68",
          }}
        >
          DETECTED.
        </div>

        <div style={{ display: "flex", marginTop: 12, fontSize: 28, color: "rgba(249,251,245,.66)" }}>
          Think of someone. Don’t snitch. Let the detector cook.
        </div>

        <div style={{ display: "flex", marginTop: 22, gap: 14 }}>
          {["Probability", "Information gain", "Gemini fallback", "Brainrot"].map((label) => (
            <span
              key={label}
              style={{
                display: "flex",
                padding: "9px 13px",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 12,
                fontSize: 16,
                color: "rgba(249,251,245,.54)",
                background: "rgba(255,255,255,.035)",
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>,
    size,
  );
}
