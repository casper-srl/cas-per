import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/offerta-dedicata/interaction.js', import.meta.url), 'utf8');
function browser() {
  const node = () => ({ listeners: {}, addEventListener(type, listener) { this.listeners[type] = listener; } });
  const ctas = [node(), node(), node()], close = node(), frame = { removeAttribute(name) { delete this[name]; } };
  const legacy = [0, 1, 2, 3].map(() => ({ removed: false, remove() { this.removed = true; } }));
  const dialog = { ...node(), querySelectorAll: () => legacy, append(panel) { this.panel = panel; }, showModal() { this.open = true; }, close() { this.open = false; this.listeners.close(); } };
  ctas.forEach(cta => { cta.focus = () => { cta.focused = true; }; });
  const document = {
    getElementById: () => dialog,
    createElement: () => ({ querySelector: () => frame }),
    querySelector: () => close,
    querySelectorAll: selector => selector === '[data-book]' ? ctas : []
  };
  // No CMP, consent grant, network API or simulated form exists in this visitor context.
  vm.runInNewContext(source, { document, encodeURIComponent });
  return { ctas, close, frame, dialog, legacy };
}
test('every booking CTA works without measurement consent and only loads Google after the click', () => {
  const b = browser();
  assert.equal(b.frame.src, undefined);
  assert.ok(b.legacy.every(node => node.removed));
  assert.match(b.dialog.panel.innerHTML, /referrerpolicy="no-referrer"/);
  assert.match(b.dialog.panel.innerHTML, /target="_blank" rel="noopener noreferrer"/);
  for (const cta of b.ctas) {
    cta.listeners.click();
    assert.equal(b.dialog.open, true);
    assert.match(b.frame.src, /^https:\/\/calendar\.google\.com\/calendar\/appointments\/schedules\/[^?]+\?gv=true$/);
    b.close.listeners.click();
    assert.equal(b.frame.src, undefined);
    assert.equal(cta.focused, true);
  }
});
