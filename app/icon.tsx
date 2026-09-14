import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          borderRadius: 6,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M1 7V1H7 M17 1H23V7 M23 17V23H17 M7 23H1V17"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="square"
          />
          <rect x="10" y="10" width="4" height="4" fill="#fff" />
        </svg>
      </div>
    ),
    size
  );
}
