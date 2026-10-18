"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";

/* The Help, Feedback and About actions and their dialogs, in the shop's shared set (Mallet Board's icons and
   labels). Help holds the help and the guide. Feedback holds the two forms and the two email links. About
   holds the build, More apps, the guide and the copyright. The footer is separate (SiteFooter). */

const ICON = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

function HelpIcon() {
  return <svg {...ICON}><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></svg>;
}

function FeedbackIcon() {
  return <svg {...ICON}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}

function InfoIcon() {
  return <svg {...ICON}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>;
}

const openDialog = (id: string) => (document.getElementById(id) as HTMLDialogElement | null)?.showModal();

export function WorkspaceActions() {
  return <nav className="workspace-actions" aria-label="Help and app information">
    <button type="button" aria-label="Help" title="Help" onClick={() => openDialog("workspace-help")}><HelpIcon /><span>Help</span></button>
    <button type="button" aria-label="Feedback" title="Send feedback" onClick={() => openDialog("workspace-feedback")}><FeedbackIcon /><span>Feedback</span></button>
    <button type="button" aria-label="About" title="About" onClick={() => openDialog("workspace-about")}><InfoIcon /><span>About</span></button>
  </nav>;
}

export default function WorkspaceInfo({ name, guide, help, feedback, children }: { name: string; guide?: string; help?: ReactNode; feedback: ReactNode; children: ReactNode }) {
  const helpDialog = useRef<HTMLDialogElement>(null);
  const feedbackDialog = useRef<HTMLDialogElement>(null);
  const aboutDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const guard = (event: KeyboardEvent) => {
      if (helpDialog.current?.open || feedbackDialog.current?.open || aboutDialog.current?.open) event.stopImmediatePropagation();
    };
    window.addEventListener("keydown", guard, true);
    return () => window.removeEventListener("keydown", guard, true);
  }, []);
  // A mail link hands the message to the mail app, so the dialog holding it closes.
  const closeForSupport = (event: MouseEvent<HTMLDialogElement>) => {
    if ((event.target as HTMLElement).closest('a[href^="mailto:"]')) event.currentTarget.close();
  };
  const closeBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) event.currentTarget.close();
  };
  return <>
    <dialog id="workspace-help" ref={helpDialog} className="workspace-dialog" aria-labelledby="workspace-help-title" onClick={closeBackdrop}>
      <div className="workspace-dialog-heading"><h2 id="workspace-help-title">How to use {name}</h2><button type="button" aria-label="Close help" onClick={() => helpDialog.current?.close()}>Close</button></div>
      {help ?? <p>Choose your settings, then use the practice controls. Your work stays in this browser.</p>}
      {guide && <a href={guide}>Read the full guide ↗</a>}
    </dialog>
    <dialog id="workspace-feedback" ref={feedbackDialog} className="workspace-dialog" aria-labelledby="workspace-feedback-title" onClickCapture={closeForSupport} onClick={closeBackdrop}>
      <div className="workspace-dialog-heading"><h2 id="workspace-feedback-title">Send feedback</h2><button type="button" aria-label="Close feedback" onClick={() => feedbackDialog.current?.close()}>Close</button></div>
      {feedback}
    </dialog>
    <dialog id="workspace-about" ref={aboutDialog} className="workspace-dialog" aria-labelledby="workspace-about-title" onClickCapture={closeForSupport} onClick={closeBackdrop}>
      <div className="workspace-dialog-heading"><h2 id="workspace-about-title">About {name}</h2><button type="button" aria-label="Close about" onClick={() => aboutDialog.current?.close()}>Close</button></div>
      {children}
    </dialog>
  </>;
}
