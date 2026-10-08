import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import { PLATFORM_NAME } from "@/lib/platform";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: PLATFORM_NAME, template: `%s · ${PLATFORM_NAME}` },
  description: "Online booking for barbershops and appointment-based businesses.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
