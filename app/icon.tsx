import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 18,
        color: "#0a0d08",
        background: "linear-gradient(145deg, #eaffba, #c8ff68 52%, #70f4ea)",
        boxShadow: "inset 0 2px 5px rgba(255,255,255,.44)",
        fontSize: 27,
        fontWeight: 900,
        letterSpacing: "-0.08em",
      }}
    >
      SBD
    </div>,
    size,
  );
}
