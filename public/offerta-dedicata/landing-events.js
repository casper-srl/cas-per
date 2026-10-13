(() => {
  const script = document.currentScript;
  const endpoint = script.dataset.endpoint;
  const slug = script.dataset.slug;
  const uuid = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
  let startRequestId, startToken;
  let session, events = [], activeSeconds = 0, originTime = 0, startClock = 0;
  let running = false, sending = false, lastTick = performance.now();
  const depths = new Set();
  const panel = document.createElement('aside');
  panel.setAttribute('aria-label', 'Collaudo eventi della landing');
  panel.style.cssText = 'position:relative;background:#eff6ff;color:#172554;padding:12px 20px;font:13px/1.5 system-ui;border-bottom:1px solid #bfdbfe';
  panel.innerHTML = '<strong>Collaudo funzionale · Diario CRM</strong> <button type="button" style="margin:0 10px;padding:5px 12px;border:1px solid #93c5fd;border-radius:6px;background:white;color:#172554">Avvia test eventi</button><span role="status" aria-live="polite">La registrazione parte solo premendo Avvia test. L’agenda resta dimostrativa.</span>';
  document.body.prepend(panel);
  const button = panel.querySelector('button');
  const status = panel.querySelector('[role="status"]');
  const post = async payload => {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw Object.assign(new Error('Invio al Diario non riuscito'), { status: response.status });
    return response.json();
  };
  const payload = batch => ({ action: 'events', session_id: session.session_id, token: session.token, active_seconds: Math.floor(activeSeconds), events: batch });
  const flush = async () => {
    if (!session || sending || !running) return false;
    sending = true;
    const batch = events.slice(0, 40);
    try {
      const saved = await post(payload(batch));
      const ids = new Set(batch.map(event => event._id));
      events = events.filter(event => !ids.has(event._id));
      status.textContent = `${saved.total_events} ${saved.total_events === 1 ? 'evento salvato' : 'eventi salvati'} nel Diario CRM.`;
      return true;
    } catch (error) {
      if ([403, 404, 410].includes(error.status)) {
        running = false; startRequestId = undefined; startToken = undefined; button.textContent = 'Avvia nuovo test';
        status.textContent = 'Sessione non più valida. Avvia un nuovo test locale.';
      } else status.textContent = 'Collegamento momentaneamente non disponibile. Gli eventi restano in attesa nella pagina.';
      return false;
    } finally { sending = false; }
  };
  const record = (type, source) => {
    if (!running) return;
    events.push({ _id: uuid(), type, occurred_at: new Date(originTime + performance.now() - startClock).toISOString(), ...(source ? { source } : {}) });
  };
  const scroll = () => {
    if (!running) return;
    const height = document.documentElement.scrollHeight - innerHeight;
    const percent = height > 0 ? Math.min(100, Math.round(scrollY / height * 100)) : 100;
    for (const depth of [25, 50, 75, 100]) if (percent >= depth && !depths.has(depth)) {
      depths.add(depth); record(`scroll_${depth}`);
    }
  };
  button.addEventListener('click', async () => {
    if (running) {
      if (!await flush()) return;
      running = false; startRequestId = undefined; startToken = undefined; button.textContent = 'Avvia nuovo test';
      status.textContent += ' Registrazione fermata.'; return;
    }
    button.disabled = true;
    try {
      startRequestId ||= uuid();
      startToken ||= [...crypto.getRandomValues(new Uint8Array(32))].map(value => value.toString(16).padStart(2, '0')).join('');
      session = await post({ action: 'start', slug, request_id: startRequestId, token: startToken });
      events = []; depths.clear(); activeSeconds = 0;
      originTime = Date.parse(session.started_at); startClock = performance.now(); lastTick = startClock;
      running = true; button.textContent = 'Ferma test eventi'; record('page_view'); scroll(); await flush();
    } catch (error) {
      if (error.status === 410) { startRequestId = undefined; startToken = undefined; }
      status.textContent = 'Registrazione non disponibile. Riprova tra poco.';
    }
    finally { button.disabled = false; }
  });
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('a,button') : null;
    if (!target) return;
    const source = { integrazione: 'iol_integration', 'nuovo-sito': 'new_website' }[target.dataset.focus] || 'generic';
    if (target.matches('a[href^="tel:"]')) { record('phone_click', source); flush(); }
    else if (target.matches('[data-whatsapp]')) { record('whatsapp_click', source); flush(); }
    else if (target.matches('[data-book]')) { record('booking_open', source); flush(); }
  }, true);
  addEventListener('scroll', scroll, { passive: true });
  setInterval(() => {
    const now = performance.now();
    if (running && document.visibilityState === 'visible' && document.hasFocus()) activeSeconds += Math.min(2, (now - lastTick) / 1000);
    lastTick = now;
  }, 1000);
  setInterval(flush, 5000);
  addEventListener('pagehide', () => {
    if (running && session) navigator.sendBeacon(endpoint, new Blob([JSON.stringify(payload(events.slice(0, 40)))], { type: 'application/json' }));
  });
})();
