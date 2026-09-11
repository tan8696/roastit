import { ImageResponse } from "next/og";
import { getSharedRoast } from "@/lib/sharedRoast";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function scoreColor(score: number): string {
  if (score >= 70) return "#34d399";
  if (score >= 40) return "#facc15";
  return "#f87171";
}

function scoreVerdict(score: number): string {
  if (score >= 70) return "Converting well";
  if (score >= 40) return "Leaking conversions";
  return "Needs serious work";
}

export default async function Image({ params }: { params: { slug: string } }) {
  const shared = await getSharedRoast(params.slug);
  const score = shared?.result.overallScore ?? null;
  const color = score !== null ? scoreColor(score) : "#666";
  const hostname = shared
    ? (() => {
        try {
          return new URL(shared.url).hostname;
        } catch {
          return shared.url;
        }
      })()
    : "roastit.online";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#000000",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 900, color: "#ffffff" }}>
          BRUTAL<span style={{ color: "rgba(255,255,255,0.3)" }}>.</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 220,
              height: 220,
              borderRadius: "50%",
              border: `10px solid ${color}`,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 96, fontWeight: 900, color }}>
              {score !== null ? score : "—"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: "#ffffff" }}>
              {score !== null ? scoreVerdict(score) : "Teardown report"}
            </span>
            <span style={{ fontSize: 28, color: "rgba(255,255,255,0.45)" }}>{hostname}</span>
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.3)" }}>
          Brutal Roaster — AI landing page teardown
        </div>
      </div>
    ),
    { ...size }
  );
}
