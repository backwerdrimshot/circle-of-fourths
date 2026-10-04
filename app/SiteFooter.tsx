"use client";

import { useRef, useState } from "react";
import { BUILD } from "@/lib/build.mjs";

/* The shared Backwerd Rhythm Shop footer, the same as Stick Lab's: All free apps, App guide,
   Report a problem, Request a feature, the three social links, copyright, build stamp.
   The support links are plain mailto: links (they work with no JavaScript); with JavaScript a
   click opens a panel with the message pre-filled with app, build, page and browser, which can be
   copied, because a bare mailto: fails silently on machines with no email app. */

const APP = "Circle of Fourths";
const SUPPORT = `mailto:support@backwerdrhythmshop.com?subject=${encodeURIComponent(`${APP} — Support request`)}`;
const FEATURE = `mailto:feedback@backwerdrhythmshop.com?subject=${encodeURIComponent(`${APP} — Feature request`)}`;

type Support = { title: string; address: string; subject: string };

function detailsBody(kind: "support" | "feedback") {
  return (kind === "support"
    ? "Describe what went wrong — what you did, what you expected, and what actually happened:"
    : "Describe your idea or request:")
    + "\n\n\n\n─── details below help with troubleshooting ───\n"
    + `App: ${APP}\nBuild: ${BUILD}\nPage: ${location.href}\nBrowser: ${navigator.userAgent}`;
}

export default function SiteFooter() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [info, setInfo] = useState<Support>({ title: "", address: "", subject: "" });
  const [body, setBody] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy details");

  const mailto = (address: string, subject: string, text: string) =>
    `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

  function open(event: React.MouseEvent<HTMLAnchorElement>, kind: "support" | "feedback") {
    const dialog = dialogRef.current;
    if (!dialog || typeof dialog.showModal !== "function") return;
    event.preventDefault();
    setInfo({
      title: kind === "support" ? "Report a problem" : "Request a feature",
      address: kind === "support" ? "support@backwerdrhythmshop.com" : "feedback@backwerdrhythmshop.com",
      subject: `${APP} — ${kind === "support" ? "Support request" : "Feature request"}`,
    });
    setBody(detailsBody(kind));
    dialog.showModal();
  }

  async function copy() {
    const text = `To: ${info.address}\nSubject: ${info.subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("Copied ✓");
    } catch {
      setCopyLabel("Press Ctrl+C to copy");
    }
    window.setTimeout(() => setCopyLabel("Copy details"), 2000);
  }

  return (
    <footer className="foot hide-when-presenting no-print">
      {APP} · a free practice tool by{" "}
      <a className="shop-link" href="https://backwerdrhythmshop.com">Backwerd Rhythm Shop</a>
      <br />
      Fourth-first for band classrooms. Flip once to see the same relationships as fifths.
      <nav className="foot-links" aria-label="Backwerd Rhythm Shop">
        <a className="foot-btn" href="https://apps.backwerdrhythmshop.com/">All free apps</a>
        <a className="foot-btn" href="https://guides.backwerdrhythmshop.com/circle-of-fourths/">App guide</a>
        <a className="foot-btn" href={SUPPORT} onClick={(e) => open(e, "support")}>Report a problem</a>
        <a className="foot-btn" href={FEATURE} onClick={(e) => open(e, "feedback")}>Request a feature</a>
        <a className="foot-btn foot-ico" href="https://www.facebook.com/backwerdrhythmshop/" target="_blank" rel="noopener noreferrer" aria-label="Backwerd Rhythm Shop on Facebook" title="Facebook"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" /></svg></a>
        <a className="foot-btn foot-ico" href="https://www.instagram.com/backwerdrhythmshop/" target="_blank" rel="noopener noreferrer" aria-label="Backwerd Rhythm Shop on Instagram" title="Instagram"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm7.846-10.405a1.441 1.441 0 01-2.88 0 1.44 1.44 0 012.88 0z" /></svg></a>
        <a className="foot-btn foot-ico" href="https://www.youtube.com/@backwerdrhythmshop" target="_blank" rel="noopener noreferrer" aria-label="Backwerd Rhythm Shop on YouTube" title="YouTube"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg></a>
      </nav>
      <div className="foot-copy">© 2026 Backwerd Rimshot, LLC. All rights reserved.</div>
      <div className="build-stamp">Build {BUILD}</div>

      <dialog ref={dialogRef} className="support-dialog no-print" aria-labelledby="support-dialog-title">
        <h2 id="support-dialog-title">{info.title}</h2>
        <p className="support-dialog-lede">
          Open your email app below, or copy the message and paste it into any email (webmail included) addressed to{" "}
          <strong>{info.address}</strong>.
        </p>
        <label className="support-dialog-label">Message
          <textarea rows={9} spellCheck={false} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <div className="support-dialog-actions">
          <a className="foot-btn" href={mailto(info.address, info.subject, body)}>Open in my email app</a>
          <button type="button" className="foot-btn" onClick={copy}>{copyLabel}</button>
          <button type="button" className="foot-btn" onClick={() => dialogRef.current?.close()}>Close</button>
        </div>
        <p className="support-dialog-hint">Nothing opens? This device has no email app set up. Use &ldquo;Copy details&rdquo; and paste into the email service you use.</p>
      </dialog>
    </footer>
  );
}
