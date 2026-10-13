import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/offerta-dedicata/landing-events.js', import.meta.url), 'utf8');
const settle = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const response = (body, status = 200) => ({ ok: status === 200, status, json: async () => body });
async function browser({ configStatus = 200, start, append } = {}) {
  const requests = [], beacons = [], nodes = [], listeners = {}, timers = [];
  let now = 0, total = 0;
  const listen = (event, handler) => { (listeners[event] ||= []).push(handler); };
  class Element {
    constructor(kind, focus) { this.kind = kind; this.dataset = { focus }; }
    closest() { return this; }
    matches(selector) { return { phone: 'a[href^="tel:"]', whatsapp: '[data-whatsapp]', booking: '[data-book]' }[this.kind] === selector; }
  }
  const document = {
    currentScript: { dataset: { endpoint: '/offerta-dedicata/events', slug: 'guerra' } },
    documentElement: { scrollHeight: 2000 }, visibilityState: 'visible', hasFocus: () => true,
    addEventListener: listen, createElement: tag => ({ tag, style: {} }),
    querySelector: () => ({ after: node => nodes.push(node) }), head: { append: node => nodes.push(node) }
  };
  const context = vm.createContext({ document, crypto: webcrypto, Element, Uint8Array, Date, Blob,
    innerHeight: 500, scrollY: 0, performance: { now: () => now },
    addEventListener: listen, setInterval: (handler, delay) => timers.push({ handler, delay }),
    navigator: { sendBeacon: (url, body) => { beacons.push(body); return true; } },
    fetch: async (url, options) => {
      if (!options) return response({ iubendaSiteId: 3489073, iubendaPolicyId: 88572891 }, configStatus);
      assert.equal(options.keepalive, true);
      const payload = JSON.parse(options.body); requests.push(payload);
      if (payload.action === 'start') return start ? start(payload) : response({ session_id: payload.request_id, token: payload.token, started_at: '2026-10-14T08:00:00.000Z' });
      if (append) return append(payload);
      total += payload.events.length;
      return response({ total_events: total });
    }
  });
  context.window = context;
  vm.runInContext(source, context); await settle();
  const dispatch = (event, detail) => listeners[event]?.forEach(handler => handler(detail));
  const preference = async (value, callback = 'onPreferenceExpressedOrNotNeeded') => { context._iub.csConfiguration.callback[callback](value); await settle(); };
  const tick = async (delay, ms = delay) => { now += ms; timers.filter(timer => timer.delay === delay).forEach(timer => timer.handler()); await settle(); };
  const click = async (kind, focus) => { dispatch('click', { target: new Element(kind, focus), preventDefault() { throw new Error('Navigation must remain enabled'); } }); await settle(); };
  return { requests, beacons, nodes, context, document, preference, tick, click, dispatch };
}
test('no tracking before choice, rejection, marketing-only consent or absent CMP', async () => {
  const b = await browser();
  for (const choice of [undefined, { consent: false }, { purposes: { 4: false, 5: true } }, { consent: true, purposes: { 4: false } }]) await b.preference(choice);
  await b.click('booking', 'nuovo-sito'); await b.tick(5000); b.dispatch('pagehide');
  assert.equal(b.requests.length, 0); assert.equal(b.beacons.length, 0);
  const broken = await browser({ configStatus: 503 }); await broken.tick(5000);
  assert.equal(broken.requests.length, 0); assert.equal(broken.nodes.filter(n => n.tag === 'script').length, 0);
});
test('saved measurement consent automatically starts once and records page view', async () => {
  const b = await browser();
  await b.preference({ purposes: { 4: true, 5: false } });
  await b.preference({ purposes: { 4: true } }, 'onPreferenceExpressed');
  assert.equal(b.requests.filter(r => r.action === 'start').length, 1);
  assert.equal(b.requests[1].events[0].type, 'page_view'); assert.equal(b.requests[0].slug, 'guerra');
  assert.equal(b.nodes.filter(n => n.tag === 'script').length, 1);
  assert.ok(!b.nodes.some(n => /Avvia test/.test(n.innerHTML || '')));
});
test('CTA sources and scroll thresholds remain distinct without blocking links', async () => {
  const b = await browser(); await b.preference({ consent: true });
  await b.click('booking', 'integrazione'); await b.click('booking', 'nuovo-sito');
  await b.click('phone'); await b.click('whatsapp');
  b.context.scrollY = 1500; b.dispatch('scroll'); b.dispatch('scroll'); await b.tick(5000);
  const events = b.requests.flatMap(r => r.events || []);
  assert.deepEqual(events.filter(e => e.type === 'booking_open').map(e => e.source), ['iol_integration', 'new_website']);
  assert.ok(events.some(e => e.type === 'phone_click')); assert.ok(events.some(e => e.type === 'whatsapp_click'));
  for (const depth of [25, 50, 75, 100]) assert.equal(events.filter(e => e.type === `scroll_${depth}`).length, 1);
});
test('early clicks survive session initialization and a lost start response retries the same identity', async () => {
  const gate = deferred(); let calls = 0;
  const b = await browser({ start: async payload => {
    if (++calls === 1) { await gate.promise; throw new Error('network'); }
    return response({ session_id: payload.request_id, token: payload.token, started_at: '2026-10-14T08:00:00.000Z' });
  } });
  await b.preference({ consent: true }); await b.click('booking', 'nuovo-sito');
  gate.resolve(); await settle(); await b.tick(5000);
  assert.equal(b.requests[0].request_id, b.requests[1].request_id); assert.equal(b.requests[0].token, b.requests[1].token);
  assert.deepEqual(b.requests[2].events.map(e => e.type), ['page_view', 'booking_open']);
});
test('failed event delivery retries exactly the same event IDs and timestamps', async () => {
  let calls = 0;
  const b = await browser({ append: payload => ++calls === 1 ? response({}, 429) : response({ total_events: payload.events.length }) });
  await b.preference({ consent: true }); await b.tick(5000);
  assert.deepEqual(b.requests[1].events, b.requests[2].events);
});
test('revocation drops pending events and stale async results; regrant creates a new visit', async () => {
  const gate = deferred(); let calls = 0;
  const b = await browser({ start: async payload => {
    if (++calls === 1) await gate.promise;
    return response({ session_id: payload.request_id, token: payload.token, started_at: '2026-10-14T08:00:00.000Z' });
  } });
  await b.preference({ consent: true }); await b.click('booking');
  await b.preference({ consent: false }, 'onPreferenceExpressed'); gate.resolve(); await settle();
  await b.tick(5000); b.dispatch('pagehide'); assert.equal(b.requests.length, 1); assert.equal(b.beacons.length, 0);
  await b.preference({ consent: true }); assert.notEqual(b.requests[0].request_id, b.requests[1].request_id);
  assert.deepEqual(b.requests[2].events.map(e => e.type), ['page_view']);
});
test('active time excludes hidden tabs; unload uses beacon and revocation disables it', async () => {
  const b = await browser(); await b.preference({ consent: true });
  await b.tick(1000); b.document.hasFocus = () => false; await b.tick(1000);
  b.document.visibilityState = 'hidden'; b.dispatch('visibilitychange'); await settle();
  await b.tick(1000, 100000); await b.tick(5000, 0);
  assert.equal(b.requests.at(-1).active_seconds, 1);
  b.dispatch('pagehide'); const sent = JSON.parse(await b.beacons[0].text()); assert.equal(sent.session_id, b.requests[0].request_id);
  await b.preference({ consent: false }); b.dispatch('pagehide'); assert.equal(b.beacons.length, 1);
});
test('expired and invalid sessions stop; a full event queue remains bounded', async () => {
  const expired = await browser(); await expired.preference({ consent: true }); await expired.tick(5000, 30 * 60000);
  const count = expired.requests.length; await expired.click('booking'); await expired.tick(5000); assert.equal(expired.requests.length, count);
  const full = await browser({ append: () => response({}, 503) }); await full.preference({ consent: true });
  for (let i = 0; i < 250; i++) await full.click('booking');
  full.dispatch('pagehide'); assert.equal(JSON.parse(await full.beacons[0].text()).events.length, 40);
});
