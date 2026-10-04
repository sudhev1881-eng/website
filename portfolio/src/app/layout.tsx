import type { Metadata } from "next";
import { Bebas_Neue, DM_Sans, Great_Vibes } from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
import { ScrollProgress } from "@/components/Motion";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const script = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sudhev Mathew Abi — Portfolio",
  description:
    "Computer Engineering student at NJIT building modern web experiences across AI, cybersecurity, and software development.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${script.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <SmoothScroll>
          <ScrollProgress />
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
