/**
 * Where a learner or teacher sends a problem or a feature request.
 *
 * Both are the shop's Google Forms, shared by every app. Each form has an "App"
 * question, so one form serves every app and the answers can be told apart.
 * A link opens its form with the app's name and the page as it stands
 * pre-filled. If a form is ever unset, the link falls back to the shop's email
 * address. Change a form here, not in the components that show it.
 */

export const APP_NAME = "Circle of Fourths";

/** The shop's forms. A form set to null falls back to its email address. */
export const SHOP_FORMS = {
  support: {
    /** The form's viewer address, as Google gives it. */
    url: "https://docs.google.com/forms/d/e/1FAIpQLSeZeT_J2QIag3TsO-NxrCNPxVBxSIz_mHzKgZWuZQ-i_UmcCg/viewform",
    /** The entry field that takes the app's name. */
    appField: "entry.588933919",
    /** The entry field that takes the page, its settings and the build. */
    setupField: "entry.1893079260",
  },
  feedback: {
    url: "https://docs.google.com/forms/d/e/1FAIpQLSfP29vqlwt3UX1rbguiLEsR7t5ONZbEpuWoix0_7aDF2eMXDg/viewform",
    appField: "entry.2020831353",
    setupField: "entry.1906602408",
  },
};

/** The email address each kind of request goes to when its form is not set. */
export const FALLBACK_MAILTO = {
  support: `mailto:support@backwerdrhythmshop.com?subject=${encodeURIComponent(`${APP_NAME} — Support request`)}`,
  feedback: `mailto:feedback@backwerdrhythmshop.com?subject=${encodeURIComponent(`${APP_NAME} — Feature request`)}`,
};

/** Only a Google Forms address and entry fields may be pre-filled. */
const FORM_ADDRESS = /^https:\/\/docs\.google\.com\/forms\//;
const ENTRY_FIELD = /^entry\.\d+$/;

/** The form if it can be used, otherwise null. */
function usableForm(form) {
  return form && FORM_ADDRESS.test(form.url) && ENTRY_FIELD.test(form.appField) && ENTRY_FIELD.test(form.setupField)
    ? form
    : null;
}

/** True when a request of this kind opens the shop's form rather than email. */
export function hasForm(kind, forms = SHOP_FORMS) {
  return usableForm(forms[kind]) !== null;
}

/** The address a link shows before it is followed: the plain form, or the email address. */
export function requestBase(kind, forms = SHOP_FORMS) {
  return usableForm(forms[kind])?.url ?? FALLBACK_MAILTO[kind];
}

/** Where a link goes once followed: the form with the app and the setup filled in, or the email address. */
export function requestHref(kind, setup, forms = SHOP_FORMS) {
  const form = usableForm(forms[kind]);
  if (!form) return FALLBACK_MAILTO[kind];
  const url = new URL(form.url);
  url.searchParams.set("usp", "pp_url");
  url.searchParams.set(form.appField, APP_NAME);
  url.searchParams.set(form.setupField, setup);
  return url.toString();
}
