import { ImageResponse } from "next/og";
import { Logo } from "@/components/Logo";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<Logo size={32} />, { ...size });
}
