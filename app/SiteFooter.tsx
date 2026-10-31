"use client";

import WorkspaceInfo from "./WorkspaceInfo";

import { BUILD } from "@/lib/build.mjs";
import SupportLink from "./SupportLink";
import { emailHref } from "@/lib/support-links.mjs";

/* The shared Backwerd Rhythm Shop footer, in the standard order: the social links, Report a problem, Request
   a feature, Guide, All free apps, the copyright and the build stamp. The two request links open the shop's
   forms in a new tab, pre-filled with the app and the page; without a form they fall back to the shop's email
   address (lib/support-links.mjs). The email links are in the Feedback dialog, beside the forms. */

const APP = "Circle of Fourths";
const GUIDE = "https://guides.backwerdrhythmshop.com/circle-of-fourths/";

const SOCIAL_LINKS = [
  { network: "Facebook", href: "https://www.facebook.com/backwerdrhythmshop/" },
  { network: "Instagram", href: "https://www.instagram.com/backwerdrhythmshop/" },
  { network: "YouTube", href: "https://www.youtube.com/@backwerdrhythmshop" },
] as const;

/* The three social marks, drawn as Mallet Board draws them: 16px, in the text colour. */
function SocialGlyph({ network }: { network: string }) {
  if (network === "Facebook") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.29-.04-1.27-.13-2.41-.13-2.38 0-4.01 1.45-4.01 4.13v2.3H7.5V13h2.78v8Z" />
      </svg>
    );
  }
  if (network === "Instagram") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M21.6 7.2a2.5 2.5 0 0 0-1.75-1.77C18.3 5 12 5 12 5s-6.3 0-7.85.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.75 1.77C5.7 19 12 19 12 19s6.3 0 7.85-.43a2.5 2.5 0 0 0 1.75-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8Z" />
      <path fill="var(--paper, #fff)" d="M10.25 15.02 15.5 12l-5.25-3.02Z" />
    </svg>
  );
}

/* The Feedback dialog: the two forms, then the two email links. Email never depends on a form. */
const FEEDBACK = <>
  <p>The forms open in a new tab with this app and page filled in. Email works too.</p>
  <div className="feedback-options">
    <SupportLink kind="support" className="dialog-link">Report a problem</SupportLink>
    <SupportLink kind="feedback" className="dialog-link">Request a feature</SupportLink>
    <a className="dialog-link" href={emailHref("support")}>Email support</a>
    <a className="dialog-link" href={emailHref("feedback")}>Email feedback</a>
  </div>
  <p className="feedback-note">The forms are for teachers and adults. Students, please tell your teacher instead.</p>
</>;

/* About: the build, More apps and the guide, then the copyright. The support links live in the footer. */
const ABOUT = <>
  <p className="build-stamp">Build {BUILD}</p>
  <nav className="about-links" aria-label="More from Backwerd Rhythm Shop">
    <a className="dialog-link" href="https://apps.backwerdrhythmshop.com/">More apps</a>
    <a className="dialog-link" href={GUIDE}>Guide</a>
  </nav>
  <p className="about-copyright">© 2026 Backwerd Rimshot, LLC. All rights reserved.</p>
</>;

export default function SiteFooter() {
  return <>
    <WorkspaceInfo
      name={APP}
      guide={GUIDE}
      help={<p>Choose your settings, then use the practice controls. Your work stays in this browser. Fourth-first for band classrooms. Flip once to see the same relationships as fifths.</p>}
      feedback={FEEDBACK}
    >{ABOUT}</WorkspaceInfo>
    <footer className="foot hide-when-presenting no-print">
      <nav className="foot-social" aria-label="Backwerd Rhythm Shop on social media">
        {SOCIAL_LINKS.map(({ network, href }) => (
          <a key={network} className="foot-ico" href={href} target="_blank" rel="noreferrer" aria-label={`Backwerd Rhythm Shop on ${network}`} title={network}>
            <SocialGlyph network={network} />
          </a>
        ))}
      </nav>
      <nav className="foot-links" aria-label="Circle of Fourths support and more">
        <SupportLink kind="support">Report a problem</SupportLink>
        <SupportLink kind="feedback">Request a feature</SupportLink>
        <a href={GUIDE}>Guide</a>
        <a href="https://apps.backwerdrhythmshop.com/">All free apps</a>
      </nav>
      <p className="foot-note">The problem and feature forms are for teachers and adults. Students, please tell your teacher instead.</p>
      <p className="foot-copy">© 2026 Backwerd Rimshot, LLC. All rights reserved.</p>
      <p className="build-stamp">Build {BUILD}</p>
    </footer>
  </>;
}
