import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
const source = readFileSync(new URL('../public/offerta-dedicata/interaction.js', import.meta.url), 'utf8');
const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function browser({ reply = () => ({ status: 'pending' }), slug = 'guerra' } = {}) {
  const node = () => ({ listeners: {}, hidden: false, dataset: {}, addEventListener(type, handler) { this.listeners[type] = handler; }, focus() { this.focused = true; } });
  const requests = [], events = [], timers = new Map(), nodes = new Map(); let serial = 0;
  for (const selector of ['iframe', '#booking-email-form', '#booking-email', '#booking-agenda', '#booking-origin', '#booking-success', '#booking-status', '#booking-time', '#booking-return', '#booking-agenda a', 'button']) nodes.set(selector, node());
  const form = nodes.get('#booking-email-form'), input = nodes.get('#booking-email'), frame = nodes.get('iframe');
  form.querySelector = selector => nodes.get(selector); form.reportValidity = () => Boolean(input.value?.includes('@'));
  frame.removeAttribute = name => { delete frame[name]; };
  const ctas = ['integrazione', 'nuovo-sito', undefined].map(focus => ({ ...node(), dataset: { focus } })), close = node();
  const dialog = { ...node(), querySelectorAll: () => [], append(panel) { this.panel = panel; }, showModal() { this.open = true; }, close() { this.open = false; this.listeners.close(); } };
  const document = {
    body: { dataset: { landingSlug: slug } }, getElementById: () => dialog,
    createElement: () => ({ querySelector: selector => nodes.get(selector) }),
    querySelector: selector => selector === '.close-dialog' ? close : null,
    querySelectorAll: selector => selector === '[data-book]' ? ctas : [], dispatchEvent: event => events.push(event)
  };
  vm.runInNewContext(source, { document, encodeURIComponent, crypto: webcrypto, Uint8Array, Intl, Date,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    setTimeout: handler => { timers.set(++serial, handler); return serial; }, clearTimeout: id => timers.delete(id),
    fetch: async (url, options) => { const payload = JSON.parse(options.body); requests.push(payload); const body = await reply(payload); return { ok: body !== null, json: async () => body }; }
  });
  const submit = async email => { input.value = email; await form.listeners.submit({ preventDefault() {} }); await settle(); };
  const poll = async () => { const waiting = [...timers.values()]; timers.clear(); for (const handler of waiting) await handler(); await settle(); };
  return { ctas, close, frame, dialog, form, input, nodes, requests, events, submit, poll };
}

test('all CTA sources open email first and load Google only after the operational request, without measurement consent', async () => {
  for (const [index, expected] of ['iol_integration', 'new_website', 'generic'].entries()) {
    const b = browser(); b.ctas[index].listeners.click(); assert.equal(b.dialog.open, true); assert.equal(b.frame.src, undefined);
    await b.submit('prova@example.test'); assert.match(b.frame.src, /^https:\/\/calendar\.google\.com\/calendar\/appointments\/schedules\/[^?]+\?gv=true$/);
    assert.equal(b.requests[0].source, expected); assert.equal(b.requests[0].slug, 'guerra');
    assert.deepEqual(JSON.parse(JSON.stringify(b.events[0].detail)), { source: expected });
    assert.match(b.dialog.panel.innerHTML, /type="email"/); assert.match(b.dialog.panel.innerHTML, /referrerpolicy="no-referrer"/);
    assert.ok(!b.frame.src.includes('prova')); b.close.listeners.click(); assert.equal(b.frame.src, undefined); assert.equal(b.ctas[index].focused, true);
  }
});

test('only a verified server response shows thanks; iframe opening, departure and unconfirmed status do not', async () => {
  let confirmed = false;
  const b = browser({ reply: () => confirmed ? { status: 'confirmed', starts_at: '2026-10-15T08:00:00.000Z', ends_at: '2026-10-15T08:30:00.000Z' } : { status: 'pending' } });
  b.ctas[1].listeners.click(); await b.submit('prova@example.test'); assert.equal(b.nodes.get('#booking-success').hidden, true);
  b.close.listeners.click(); b.ctas[0].listeners.click(); await settle();
  assert.match(b.nodes.get('#booking-origin').textContent, /02 · Nuovo sito/); assert.equal(b.requests.filter(p => p.action === 'start').length, 1);
  confirmed = true; await b.poll(); assert.equal(b.frame.src, undefined); assert.equal(b.nodes.get('#booking-success').hidden, false);
  assert.match(b.nodes.get('#booking-time').textContent, /10:00/); assert.equal(b.nodes.get('#booking-return').focused, true);
});

test('start retries preserve the same identity; verification outages never become a second booking or false confirmation', async () => {
  let unavailable = true;
  const b = browser({ reply: payload => unavailable || payload.action === 'status' ? null : {} });
  b.ctas[1].listeners.click(); await b.submit('prova@example.test'); assert.equal(b.frame.src, undefined);
  unavailable = false; await b.submit('prova@example.test');
  assert.equal(b.requests[0].request_id, b.requests[1].request_id); assert.equal(b.requests[0].token, b.requests[1].token);
  assert.match(b.nodes.get('#booking-status').textContent, /non ripetere/); assert.equal(b.nodes.get('#booking-success').hidden, true);
  await b.poll(); assert.equal(b.requests.filter(p => p.action === 'start').length, 2);
  const generic = browser({ slug: '' }); generic.ctas[2].listeners.click(); await generic.submit('base@example.test'); assert.equal(generic.requests[0].slug, '');
});
