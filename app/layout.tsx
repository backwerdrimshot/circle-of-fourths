import type { Metadata } from "next";
import { headers } from "next/headers";
import { version } from "../package.json";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const metadataBase = host
    ? new URL(`${protocol}://${host}`)
    : new URL("https://circle-of-fourths.backwerdrhythmshop.com");
  const title = "Circle of Fourths — Classroom Board";
  const description =
    "Build, reveal, reverse, share, and download the circle of fourths for keyboard and band classrooms.";
  const image = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: image, width: 1536, height: 1024, alt: "Circle of Fourths classroom board and practice marimba" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    /* The build identifier, declared so the served page can be asked which
       build it is. The shop site's daily link audit reads this out of the HTML
       of every app in the family — it is how a merged-but-not-deployed app gets
       caught — and this app was the only one of fifteen serving nothing it could
       read, so the audit reported "1 app(s) serve no build identifier" and could
       not tell a stale deploy here from a fresh one.

       A meta tag rather than footer text, which is the shape that site's reader
       documents as the one to adopt: it survives bundling, needs no visible
       element, and does not depend on how a framework renders text. Grid Board
       moved to it for the same reason after its stamp ended up inside a hashed
       Vite chunk.

       Read from package.json rather than typed here, so the page cannot claim a
       version the package has moved past. */
    other: { build: version },
  };
}

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
