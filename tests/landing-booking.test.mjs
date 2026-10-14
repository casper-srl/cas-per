import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
const source = readFileSync(new URL('../public/offerta-dedicata/interaction.js', import.meta.url), 'utf8');
const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function browser({ reply = () => ({ status: 'pending' }), slug = 'guerra', storage = new Map(), popupBlocked = false } = {}) {
  const node = () => ({ listeners: {}, hidden: false, dataset: {}, addEventListener(type, handler) { this.listeners[type] = handler; }, focus() { this.focused = true; } });
  const requests = [], events = [], tabs = [], timers = new Map(), nodes = new Map(); let serial = 0;
  for (const selector of ['#booking-email-form', '#booking-email', '#booking-agenda', '#booking-origin', '#booking-success', '#booking-status', '#booking-time', '#booking-return', '#booking-agenda a', '#booking-check', 'button']) nodes.set(selector, node());
  const form = nodes.get('#booking-email-form'), input = nodes.get('#booking-email');
  form.querySelector = selector => nodes.get(selector); form.reportValidity = () => Boolean(input.value?.includes('@'));
  const ctas = ['integrazione', 'nuovo-sito', undefined].map(focus => ({ ...node(), dataset: { focus } })), close = node();
  const dialog = { ...node(), querySelectorAll: () => [], append(panel) { this.panel = panel; }, showModal() { this.open = true; }, close() { this.open = false; this.listeners.close(); } };
  const document = {
    ...node(), visibilityState: 'visible', body: { dataset: { landingSlug: slug } }, getElementById: () => dialog,
    createElement: () => ({ querySelector: selector => nodes.get(selector) }),
    querySelector: selector => selector === '.close-dialog' ? close : null,
    querySelectorAll: selector => selector === '[data-book]' ? ctas : [], dispatchEvent: event => events.push(event)
  };
  const window = { ...node(), location: { pathname: `/offerta-dedicata/${slug}/` }, open(url) {
    if (popupBlocked) return null;
    const tab = { url, opener: 'parent', document: { write() {} }, close() { this.closed = true; } };
    tab.location = { replace(next) { tab.url = next; } }; tabs.push(tab); return tab;
  } };
  const sessionStorage = { getItem:key=>storage.get(key)||null, setItem:(key,value)=>storage.set(key,value), removeItem:key=>storage.delete(key) };
  vm.runInNewContext(source, { document, window, sessionStorage, encodeURIComponent, crypto: webcrypto, Uint8Array, Intl, Date,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    setTimeout: handler => { timers.set(++serial, handler); return serial; }, clearTimeout: id => timers.delete(id),
    fetch: async (url, options) => { const payload = JSON.parse(options.body); requests.push(payload); const body = await reply(payload); return { ok: body !== null, json: async () => ({ expires_at: new Date(Date.now()+30*60000).toISOString(), ...body }) }; }
  });
  const submit = async email => { input.value = email; await form.listeners.submit({ preventDefault() {} }); await settle(); };
  const poll = async () => { const waiting = [...timers.values()]; timers.clear(); for (const handler of waiting) await handler(); await settle(); };
  return { ctas, close, tabs, dialog, form, input, nodes, requests, events, submit, poll, storage, window };
}

test('all CTA sources open a dedicated Google tab only after operational verification, without iframe or measurement consent', async () => {
  for (const [index, expected] of ['iol_integration', 'new_website', 'generic'].entries()) {
    const b = browser(); b.ctas[index].listeners.click(); assert.equal(b.dialog.open, true); assert.equal(b.tabs.length,0);
    await b.submit('prova@example.test'); assert.match(b.tabs[0].url, /^https:\/\/calendar\.google\.com\/calendar\/appointments\/schedules\/[^?]+$/);
    assert.equal(b.tabs[0].opener,null); assert.equal(b.requests[0].source,expected); assert.equal(b.requests[0].slug,'guerra');
    assert.deepEqual(JSON.parse(JSON.stringify(b.events[0].detail)),{source:expected});
    assert.ok(!b.dialog.panel.innerHTML.includes('<iframe')); assert.ok(!b.tabs[0].url.includes('prova'));
    b.close.listeners.click(); assert.equal(b.ctas[index].focused,true);
  }
});

test('only verified server confirmation shows thanks after returning from the agenda', async () => {
  let confirmed=false;
  const b=browser({reply:()=>confirmed?{status:'confirmed',starts_at:'2026-10-15T08:00:00.000Z',ends_at:'2026-10-15T08:30:00.000Z'}:{status:'pending'}});
  b.ctas[1].listeners.click(); await b.submit('prova@example.test'); assert.equal(b.nodes.get('#booking-success').hidden,true);
  b.close.listeners.click(); b.ctas[0].listeners.click(); await settle();
  assert.match(b.nodes.get('#booking-origin').textContent,/02 · Nuovo sito/); assert.equal(b.requests.filter(p=>p.action==='start').length,1);
  confirmed=true; b.window.listeners.focus(); await settle();
  assert.equal(b.nodes.get('#booking-success').hidden,false); assert.match(b.nodes.get('#booking-time').textContent,/10:00/);
});

test('retries reuse the request; outages close the reserved tab and never claim success', async () => {
  let unavailable=true;
  const b=browser({reply:payload=>unavailable||payload.action==='status'?null:{}});
  b.ctas[1].listeners.click(); await b.submit('prova@example.test'); assert.equal(b.tabs[0].closed,true); assert.equal(b.tabs[0].url,'about:blank');
  unavailable=false; await b.submit('prova@example.test');
  assert.equal(b.requests[0].request_id,b.requests[1].request_id); assert.equal(b.requests[0].token,b.requests[1].token);
  assert.match(b.nodes.get('#booking-status').textContent,/non ripetere/); assert.equal(b.nodes.get('#booking-success').hidden,true);
  await b.poll(); assert.equal(b.requests.filter(p=>p.action==='start').length,2);
});

test('a blocked popup leaves a normal agenda link and does not record an opening that did not happen', async () => {
  const b=browser({popupBlocked:true}); b.ctas[2].listeners.click(); await b.submit('prova@example.test');
  assert.equal(b.tabs.length,0); assert.equal(b.events.length,0); assert.equal(b.nodes.get('#booking-agenda').hidden,false);
  b.nodes.get('#booking-agenda a').listeners.click(); assert.equal(b.events[0].type,'landing:booking-open');
});

test('refresh restores verification for the same page without storing email, reopening Google or duplicating the request', async () => {
  const first=browser(); first.ctas[1].listeners.click(); await first.submit('prova@example.test');
  assert.ok(![...first.storage.values()].join('').includes('prova@example.test'));
  const restored=browser({storage:first.storage}); await settle();
  assert.equal(restored.dialog.open,true); assert.equal(restored.tabs.length,0); assert.equal(restored.events.length,0);
  assert.equal(restored.requests[0].action,'status'); assert.equal(restored.requests[0].request_id,first.requests[0].request_id);
  const other=browser({slug:'another',storage:first.storage}); assert.equal(other.dialog.open,undefined);
});