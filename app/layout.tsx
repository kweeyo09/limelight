import type { Metadata } from "next";
import { Bodoni_Moda, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const serif = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "700"],
  variable: "--font-serif",
  display: "swap",
});

const mono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Limelight — Theatre Log",
  description:
    "A theatre log of West End shows seen, kept as draggable ticket stubs on a curtained stage.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
