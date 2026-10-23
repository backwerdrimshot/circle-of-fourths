// Inert module: importing it performs no collection and writes no storage.
// An accepted host/path config must be passed by reviewed application code.
export function createMeasurementClient(config, platform = window) {
  const endpoint = "https://backwerdrhythmshop.com/__brs/measurement";
  const version = "brs-measurement-v1";
  const allowed = () => config?.enabled === true && config?.operationalApproved === true &&
    config.origin === platform.location.origin && config.path === platform.location.pathname &&
    platform.self === platform.top && !platform.location.search && !platform.location.hash;
  const slots = new Map();
  let pageSent = false;
  let consent = false;
  let destroyed = false;
  const permitted = () => !destroyed && allowed() && config.mode !== "student-protective" &&
    config.sponsorApproved === true && consent && platform.navigator.globalPrivacyControl !== true;
  const send = (type, id, extra = {}) => {
    if (!allowed() || (type !== "page_open" && !permitted())) return;
    // No cookies, full URL, referrer, free text, client timestamp or visitor ID.
    const payload = { version, type, page_id: config.id, event_id: id, ...extra };
    try {
      return platform.fetch(endpoint, {
        method: "POST", credentials: "omit", referrerPolicy: "no-referrer",
        headers: { "content-type": "application/json" }, keepalive: true,
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch { return; }
  };
  const open = () => {
    if (!allowed() || destroyed || pageSent) return;
    pageSent = true;
    return send("page_open", platform.crypto.randomUUID());
  };
  function activate(slot) {
    if (!permitted() || slot.started) return;
    slot.started = true;
    if (!slot.renderSent) { slot.renderSent = true; send("sponsor_render", slot.id, { placement_id: slot.placement, consent: version }); }
    const event = type => send(type, slot.id, { placement_id: slot.placement, consent: version });
    const reset = () => { if (slot.timer !== null) platform.clearTimeout(slot.timer); slot.timer = null; };
    slot.reset = reset;
    slot.check = () => {
      reset();
      if (permitted() && !slot.viewed && slot.ratio >= .5 && platform.document.visibilityState === "visible") {
        slot.timer = platform.setTimeout(() => {
          slot.timer = null;
          if (permitted() && slot.ratio >= .5 && platform.document.visibilityState === "visible" && !slot.viewed) {
            slot.viewed = true; event("sponsor_viewable");
          }
        }, 1000);
      }
    };
    slot.click = e => { if (e.isTrusted && permitted() && !slot.clicked) { slot.clicked = true; event("sponsor_click"); } };
    slot.element.addEventListener("click", slot.click);
    platform.document.addEventListener("visibilitychange", slot.check);
    try {
      slot.observer = new platform.IntersectionObserver(entries => {
        slot.ratio = entries.find(e => e.target === slot.element)?.intersectionRatio ?? 0;
        slot.check();
      }, { threshold: [0, .5, 1] });
      slot.observer.observe(slot.element);
      if (!slot.measurementReported) { slot.measurementReported = true; event("sponsor_measurable"); }
    } catch {
      if (!slot.measurementReported) { slot.measurementReported = true; event("sponsor_unmeasurable"); }
    }
  }
  function pause(slot) {
    slot.reset?.(); slot.observer?.disconnect();
    if (slot.check) platform.document.removeEventListener("visibilitychange", slot.check);
    if (slot.click) slot.element.removeEventListener("click", slot.click);
    slot.ratio = 0; slot.started = false;
  }
  return Object.freeze({
    open,
    setSponsorConsent(granted) {
      consent = granted === true;
      for (const slot of slots.values()) { if (permitted()) activate(slot); else pause(slot); }
    },
    // Call only after the registered static creative is loaded and rendered.
    // A re-render/regrant reuses this instance and flags; no timer-based refresh.
    sponsorReady(element, placement) {
      if (!allowed() || config.mode === "student-protective" || !config.sponsorApproved ||
          !config.placements?.includes(placement)) return;
      const existing = slots.get(placement);
      if (existing) { if (existing.element !== element) { pause(existing); existing.element = element; activate(existing); } return; }
      const slot = { element, placement, id: platform.crypto.randomUUID(),
        timer: null, ratio: 0, started: false, viewed: false, clicked: false,
        measurementReported: false };
      slots.set(placement, slot); activate(slot);
    },
    destroy() { destroyed = true; consent = false; for (const slot of slots.values()) pause(slot); },
  });
}
