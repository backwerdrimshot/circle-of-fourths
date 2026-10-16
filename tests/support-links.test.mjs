import assert from 'node:assert/strict';
import test from 'node:test';
import { APP_NAME, FALLBACK_MAILTO, SHOP_FORMS, hasForm, requestBase, requestHref } from '../lib/support-links.mjs';

const SETUP = 'https://circle.example/?direction=fifths&key=C · build 2026-10-04.3';

test('the two shop forms are the Google Forms viewers, with their app and setup fields', () => {
  assert.deepEqual(SHOP_FORMS.support, {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSeZeT_J2QIag3TsO-NxrCNPxVBxSIz_mHzKgZWuZQ-i_UmcCg/viewform',
    appField: 'entry.588933919',
    setupField: 'entry.1893079260',
  });
  assert.deepEqual(SHOP_FORMS.feedback, {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSfP29vqlwt3UX1rbguiLEsR7t5ONZbEpuWoix0_7aDF2eMXDg/viewform',
    appField: 'entry.2020831353',
    setupField: 'entry.1906602408',
  });
});

test('before it is followed, a link is the plain form address', () => {
  assert.equal(requestBase('support'), SHOP_FORMS.support.url);
  assert.equal(requestBase('feedback'), SHOP_FORMS.feedback.url);
  assert.equal(hasForm('support'), true);
  assert.equal(hasForm('feedback'), true);
});

test('a followed link opens its form with usp, the app name and the setup filled in', () => {
  assert.equal(APP_NAME, 'Circle of Fourths');
  for (const kind of ['support', 'feedback']) {
    const form = SHOP_FORMS[kind];
    const url = new URL(requestHref(kind, SETUP));
    assert.equal(url.origin + url.pathname, form.url);
    assert.deepEqual([...url.searchParams.keys()], ['usp', form.appField, form.setupField]);
    assert.equal(url.searchParams.get('usp'), 'pp_url');
    assert.equal(url.searchParams.get(form.appField), 'Circle of Fourths');
    assert.equal(url.searchParams.get(form.setupField), SETUP, 'the setup keeps its & and = intact');
  }
});

test('a form that is unset falls back to the shop email address, with no body prefilled', () => {
  const forms = { support: null, feedback: SHOP_FORMS.feedback };
  assert.equal(hasForm('support', forms), false);
  assert.equal(requestBase('support', forms), FALLBACK_MAILTO.support);
  assert.equal(requestHref('support', SETUP, forms), FALLBACK_MAILTO.support);
  assert.match(FALLBACK_MAILTO.support, /^mailto:support@backwerdrhythmshop\.com\?subject=/);
  assert.equal(new URL(FALLBACK_MAILTO.support).searchParams.has('body'), false);
  const feedback = new URL(requestHref('feedback', SETUP, forms));
  assert.equal(feedback.origin + feedback.pathname, SHOP_FORMS.feedback.url, 'the set form still opens');
});

test('a form that is not a Google Forms address, or names a bad entry field, falls back too', () => {
  const badAddress = { support: { ...SHOP_FORMS.support, url: 'https://example.com/forms/x' }, feedback: null };
  assert.equal(requestHref('support', SETUP, badAddress), FALLBACK_MAILTO.support);
  assert.equal(requestBase('support', badAddress), FALLBACK_MAILTO.support);

  const badEntry = { support: { ...SHOP_FORMS.support, setupField: 'entry.1&usp=x' }, feedback: null };
  assert.equal(hasForm('support', badEntry), false);
  assert.equal(requestHref('support', SETUP, badEntry), FALLBACK_MAILTO.support);

  assert.match(FALLBACK_MAILTO.feedback, /^mailto:feedback@backwerdrhythmshop\.com\?subject=/);
});
