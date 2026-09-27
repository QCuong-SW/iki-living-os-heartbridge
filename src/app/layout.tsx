import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./accessibility.css";
import "./motion.css";
import "./ritual.css";
import "@fontsource/lora/latin-400.css";
import "@fontsource/lora/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/latin-400.css";
import "@fontsource/be-vietnam-pro/latin-500.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/be-vietnam-pro/latin-700.css";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-500.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-700.css";
export const metadata: Metadata = {
  title: "HeartBridge — Nhịp nhà mình",
  description: "Dành thời gian cho nhau. Gìn giữ những điều nhỏ bé.",
  appleWebApp: {
    capable: true,
    title: "HeartBridge",
    statusBarStyle: "default",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf8f3",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
