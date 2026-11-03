import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sighted: your wildlife journal",
  description:
    "Snap a photo of any animal. Get an instant ID. Build your lifelong wildlife journal.",
  // iPhone "Add to Home Screen": open full-screen with the app's name under the icon.
  appleWebApp: { capable: true, title: "Sighted", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#2c4e2c",
  // Lets the bottom tab bar sit above the iPhone home indicator when installed.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
