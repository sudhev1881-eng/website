import type { Metadata } from "next";
import { Instrument_Sans, Plus_Jakarta_Sans } from "next/font/google";

const profileSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-profile-sans",
  display: "swap",
});

const profileDisplay = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-profile-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Student Profile | StudentLink",
  description: "Recruiter-ready student profile on StudentLink.",
};

export default function PublicProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${profileSans.variable} ${profileDisplay.variable} public-profile-root font-[family-name:var(--font-profile-sans)]`}
    >
      {children}
    </div>
  );
}
