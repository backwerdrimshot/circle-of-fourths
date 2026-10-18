"use client";

import type { ReactNode } from "react";
import { BUILD } from "@/lib/build.mjs";
import { hasForm, requestBase, requestHref } from "@/lib/support-links.mjs";

/* A link to the shop's problem or feature form. The address written into the
   link is the plain form, so the link works with no JavaScript. When it is
   followed, the address is rewritten to the form with the app, the page and
   the build filled in. A form opens in a new tab, so the board keeps its place;
   the email fallback opens as it always did. */
export default function SupportLink({
  kind,
  className,
  children,
}: {
  kind: "support" | "feedback";
  className?: string;
  children: ReactNode;
}) {
  const form = hasForm(kind);
  return (
    <a
      className={className}
      href={requestBase(kind)}
      target={form ? "_blank" : undefined}
      rel={form ? "noreferrer" : undefined}
      onClick={(event) => {
        event.currentTarget.href = requestHref(kind, `${window.location.href} · build ${BUILD}`);
      }}
    >
      {children}
    </a>
  );
}
