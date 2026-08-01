import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Circle of Fourths — Classroom Board",
  description:
    "Build, reveal, reverse, share, and print the circle of fourths for keyboard and band classrooms.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
