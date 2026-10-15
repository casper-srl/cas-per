import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto, createHash } from 'node:crypto';
import vm from 'node:vm';
const source = readFileSync(new URL('../public/offerta-dedicata/interaction.js', import.meta.url), 'utf8');
const settle = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function browser({ reply = () => ({ status: 'pending' }), slug = 'guerra', storage = new Map(), widgetBlocked = false } = {}) {
  const node = () => ({ listeners: {}, hidden: false, dataset: {}, style: {}, addEventListener(type, handler) { this.listeners[type] = handler; }, focus() { this.focused = true; }, classList: { add() {} } });
  const requests = [], events = [], mounts = [], timers = new Map(), nodes = new Map(); let serial = 0;
  for (const selector of ['#calendly-slot-picker', '#booking-origin', '#booking-success', '#booking-status', '#booking-time', '#booking-return', '.booking-privacy']) nodes.set(selector, node());
  const widget = nodes.get('#calendly-slot-picker');
  widget.querySelector = selector => selector === 'iframe' ? widget.frame : null;
  widget.replaceChildren = () => { widget.frame = null; };
  const ctas = ['integrazione', 'nuovo-sito', undefined].map(focus => ({ ...node(), dataset: { focus } })), close = node();
  const dialog = { ...node(), querySelectorAll: () => [], querySelector: () => close, append(panel) { this.panel = panel; }, showModal() { this.open = true; }, close() { this.open = false; this.listeners.close(); } };
  const document = { ...node(), visibilityState: 'visible', body: { dataset: { landingSlug: slug } }, getElementById: () => dialog,
    createElement: () => ({ ...node(), querySelector: selector => nodes.get(selector), remove() {} }), head: { append(script) { script.onerror(); } },
    querySelector: selector => selector === '.close-dialog' ? close : null, querySelectorAll: selector => selector === '[data-book]' ? ctas : [], dispatchEvent: event => events.push(event) };
  const window = { ...node(), location: { pathname: `/offerta-dedicata/${slug}/` }, ...(widgetBlocked ? {} : { Calendly: { initInlineWidget(options) { mounts.push(options); widget.frame = { contentWindow: {} }; } } }) };
  const sessionStorage = { getItem:key=>storage.get(key)||null, setItem:(key,value)=>storage.set(key,value), removeItem:key=>storage.delete(key) };
  vm.runInNewContext(source, { document, window, sessionStorage, encodeURIComponent, crypto: webcrypto, Uint8Array, Intl, Date,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    setTimeout: handler => { timers.set(++serial, handler); return serial; }, clearTimeout: id => timers.delete(id),
    fetch: async (url, options) => { const payload = JSON.parse(options.body); requests.push(payload); const body = await reply(payload); return { ok: body !== null, json: async () => ({ expires_at: new Date(Date.now()+30*60000).toISOString(), tracking_code: createHash('sha256').update('nonce:'+payload.token).digest('hex'), ...body }) }; }
  });
  const click = async index => { await ctas[index].listeners.click(); await settle(); };
  const message = async (data, origin = 'https://calendly.com', sender = widget.frame?.contentWindow) => { window.listeners.message({ origin, source: sender, data }); await settle(); };
  const poll = async () => { const waiting = [...timers.values()]; timers.clear(); for (const handler of waiting) await handler(); await settle(); };
  return { ctas, close, dialog, nodes, requests, events, mounts, click, message, poll, storage, widget };
}
const completion = { event: 'calendly.event_scheduled', payload: { event: { uri: 'https://api.calendly.com/scheduled_events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }, invitee: { uri: 'https://api.calendly.com/scheduled_events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/invitees/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' } } };

test('all CTA sources mount Calendly in the same modal after server start, without email duplication or measurement consent', async () => {
  for (const [index, expected] of ['iol_integration', 'new_website', 'generic'].entries()) {
    const b = browser(); await b.click(index);
    assert.equal(b.dialog.open, true); assert.equal(b.requests[0].action, 'calendly_start'); assert.equal(b.requests[0].source, expected); assert.equal(b.requests[0].slug, 'guerra');
    assert.equal(Object.hasOwn(b.requests[0], 'email'), false); assert.equal(b.mounts.length, 1); assert.equal(b.mounts[0].utm.utmTerm, expected);
    assert.notEqual(b.mounts[0].utm.utmContent, b.requests[0].token); assert.ok(!b.dialog.panel.innerHTML.includes('type="email"'));
    assert.equal(b.events.length, 0); await b.message({ event: 'calendly.event_type_viewed' });
    assert.equal(b.events[0].type, 'landing:booking-open'); assert.equal(b.events[0].detail.source, expected);
    await b.message({ event: 'calendly.event_type_viewed' }); assert.equal(b.events.length, 1);
  }
});

test('browser callback alone cannot confirm; only the verified server response replaces the widget with thanks', async () => {
  let confirmed = false;
  const b = browser({ reply: () => confirmed ? { status: 'confirmed', starts_at: '2026-10-16T10:00:00.000Z', ends_at: '2026-10-16T10:30:00.000Z' } : { status: 'pending' } });
  await b.click(1); const before = b.requests.length;
  await b.message(completion, 'https://evil.example'); await b.message(completion, 'https://calendly.com', {});
  assert.equal(b.requests.length, before);
  await b.message(completion); assert.equal(b.requests.at(-1).action, 'calendly_complete'); assert.equal(b.nodes.get('#booking-success').hidden, true);
  confirmed = true; await b.poll(); assert.equal(b.nodes.get('#booking-success').hidden, false); assert.equal(b.widget.hidden, true);
  assert.match(b.nodes.get('#booking-time').textContent, /12:00/); assert.equal(b.nodes.get('#booking-return').focused, true);
});

test('start outages retry the same request and never open an untracked agenda; widget outage offers a retry', async () => {
  let unavailable = true;
  const b = browser({ reply: p => p.action === 'calendly_start' && unavailable ? null : { status: 'pending' } });
  await b.click(1); assert.equal(b.mounts.length, 0); assert.match(b.nodes.get('#booking-status').textContent, /riprovare/);
  unavailable = false; await b.click(1); assert.equal(b.requests[0].request_id, b.requests[1].request_id); assert.equal(b.mounts.length, 1);
  const blocked = browser({ widgetBlocked: true }); await blocked.click(0); assert.equal(blocked.mounts.length, 0); assert.equal(blocked.events.length, 0);
});

test('switching proposals before booking records the new source; after booking the original verification is retained', async () => {
  const b = browser(); await b.click(0); const first = b.requests[0].request_id; b.close.listeners.click(); await b.click(1);
  assert.notEqual(b.requests.find(p => p.source === 'new_website').request_id, first); assert.match(b.nodes.get('#booking-origin').textContent, /02/);
  await b.message(completion); const starts = b.requests.filter(p => p.action === 'calendly_start').length;
  b.close.listeners.click(); await b.click(0); assert.equal(b.requests.filter(p => p.action === 'calendly_start').length, starts); assert.match(b.nodes.get('#booking-origin').textContent, /02/);
});

test('refresh resumes the same booking verification and never stores invitee name or email', async () => {
  const first = browser(); await first.click(1); await first.message(completion); const restored = browser({ storage: first.storage }); await settle();
  assert.equal(restored.dialog.open, true); assert.equal(restored.requests[0].action, 'calendly_complete'); assert.equal(restored.requests[0].request_id, first.requests[0].request_id);
  assert.ok(![...first.storage.values()].join('').includes('@')); assert.equal(browser({ slug: 'other', storage: first.storage }).dialog.open, undefined);
});

test('only the active trusted iframe may resize the modal; malformed callback URLs are ignored', async () => {
  const b = browser(); await b.click(2);
  await b.message({ event: 'calendly.page_height', payload: { height: '820px' } }, 'https://evil.example'); assert.equal(b.widget.style.height, undefined);
  await b.message({ event: 'calendly.page_height', payload: { height: '820px' } }); assert.equal(b.widget.style.height, '820px');
  await b.message({ event: 'calendly.page_height', payload: { height: '999999px' } }); assert.equal(b.widget.style.height, '820px');
  const count = b.requests.length; await b.message({ ...completion, payload: { event: { uri: 'https://evil.example/event' }, invitee: completion.payload.invitee } }); assert.equal(b.requests.length, count);
});
