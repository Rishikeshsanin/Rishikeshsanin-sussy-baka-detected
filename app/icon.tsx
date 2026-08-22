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
        color: "#f7f5ff",
        background: "linear-gradient(145deg, #8d73e7, #31265f 64%, #173f43)",
        boxShadow: "inset 0 2px 5px rgba(255,255,255,.26)",
        fontSize: 34,
        fontWeight: 700,
        letterSpacing: "-0.08em",
      }}
    >
      V
    </div>,
    size,
  );
}
