import { ImageResponse } from "next/og";
import { Logo } from "@/components/Logo";

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <Logo size={470} />
      </div>
    ),
    { width: 512, height: 512 }
  );
}
