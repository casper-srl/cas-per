(() => {
  const { endpoint, slug } = document.currentScript.dataset;
  const uuid = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
  let visit = null;
  const post = async payload => {
    const response = await fetch(endpoint, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw Object.assign(new Error('Invio al Diario non riuscito'), { status: response.status });
    return response.json();
  };
  const record = (type, source) => {
    if (!visit || visit.events.length + visit.saved >= 200) return;
    visit.events.push({ _id: uuid(), type, elapsed: visit.session ? Math.max(0, performance.now() - visit.clock) : 0, ...(source ? { source } : {}) });
  };
  const scroll = () => {
    if (!visit) return;
    const height = document.documentElement.scrollHeight - innerHeight;
    const percent = height > 0 ? Math.min(100, Math.round(scrollY / height * 100)) : 100;
    for (const depth of [25, 50, 75, 100]) if (percent >= depth && !visit.depths.has(depth)) {
      visit.depths.add(depth); record(`scroll_${depth}`);
    }
  };
  const payload = current => ({ action: 'events', session_id: current.session.session_id, token: current.session.token,
    active_seconds: Math.floor(current.active), events: current.events.slice(0, 40).map(({ elapsed, ...event }) => ({ ...event, occurred_at: new Date(Date.parse(current.session.started_at) + elapsed).toISOString() })) });
  const flush = async () => {
    const current = visit;
    if (!current || current.sending) return;
    current.sending = true;
    try {
      if (!current.session) {
        const session = await post({ action: 'start', slug, request_id: current.id, token: current.token });
        if (visit !== current) return;
        current.session = session; current.clock = performance.now(); current.tick = current.clock;
      }
      if (performance.now() - current.clock >= 30 * 60000) { visit = null; return; }
      const batch = payload(current);
      const saved = await post(batch);
      if (visit !== current) return;
      const ids = new Set(batch.events.map(event => event._id));
      current.events = current.events.filter(event => !ids.has(event._id)); current.saved = saved.total_events;
    } catch (error) {
      if (visit === current && ([400, 403, 404, 409, 410].includes(error.status) || (!current.session && error.status === 429))) visit = null;
      // Temporary failures keep the same IDs and token for the next attempt.
    } finally { current.sending = false; }
  };
  let granted = false;
  const consent = preference => {
    const allowed = preference?.purposes ? preference.purposes[4] === true : preference?.consent === true;
    if (allowed === granted) return;
    granted = allowed;
    visit = null; // Revocation discards pending events, including an in-flight start.
    if (!allowed) return;
    visit = { id: uuid(), token: [...crypto.getRandomValues(new Uint8Array(32))].map(value => value.toString(16).padStart(2, '0')).join(''),
      session: null, events: [], depths: new Set(), active: 0, tick: performance.now(), saved: 0, sending: false };
    record('page_view'); scroll(); flush();
  };
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('a,button') : null;
    if (!target) return;
    const source = { integrazione: 'iol_integration', 'nuovo-sito': 'new_website' }[target.dataset.focus] || 'generic';
    if (target.matches('a[href^="tel:"]')) { record('phone_click', source); flush(); }
    else if (target.matches('[data-whatsapp]')) { record('whatsapp_click', source); flush(); }
  }, true);
  document.addEventListener('landing:booking-open', event => {
    const source = event.detail?.source;
    if (['iol_integration', 'new_website', 'generic'].includes(source)) { record('booking_open', source); flush(); }
  });
  addEventListener('scroll', scroll, { passive: true });
  setInterval(() => {
    if (!visit?.session) return;
    const now = performance.now();
    if (document.visibilityState === 'visible' && document.hasFocus()) visit.active += Math.min(2, (now - visit.tick) / 1000);
    visit.tick = now;
  }, 1000);
  setInterval(flush, 5000);
  document.addEventListener('visibilitychange', () => {
    if (visit) visit.tick = performance.now();
    if (document.visibilityState === 'hidden') flush();
  });
  addEventListener('pagehide', () => {
    if (visit?.session) navigator.sendBeacon(endpoint, new Blob([JSON.stringify(payload(visit))], { type: 'application/json' }));
  });
  const notice = document.createElement('p');
  notice.style.cssText = 'font:12px/1.6 system-ui;max-width:1100px;margin:0 auto;padding:20px 24px 100px;color:#596852';
  notice.innerHTML = 'Se acconsenti alla misurazione, Cas-Per registra nel proprio CRM la visita, il tempo attivo, lo scorrimento e i clic, associandoli all’impresa indicata in questa pagina. Puoi cambiare scelta nelle <a class="iubenda-cs-preferences-link" href="#" style="text-decoration:underline">preferenze privacy</a>. <a href="/offerta-dedicata/privacy/" target="_blank" rel="noopener" style="text-decoration:underline">Informativa privacy</a>.';
  document.querySelector('.site-footer')?.after(notice);
  fetch('/offerta-dedicata/consent-config.json').then(response => {
    if (!response.ok) throw new Error('Configurazione consenso non disponibile');
    return response.json();
  }).then(config => {
    window._iub = window._iub || [];
    window._iub.csConfiguration = {
      siteId: config.iubendaSiteId, cookiePolicyId: config.iubendaPolicyId, lang: 'it',
      cookiePolicyUrl: new URL('/offerta-dedicata/privacy/', document.baseURI).href,
      privacyPolicyUrl: new URL('/offerta-dedicata/privacy/', document.baseURI).href,
      purposes: '1,2,3,4,5', perPurposeConsent: true, consentOnContinuedBrowsing: false,
      floatingPreferencesButtonDisplay: 'bottom-right', storage: { useSiteId: true },
      banner: { acceptButtonDisplay: true, customizeButtonDisplay: true, rejectButtonDisplay: true, position: 'float-top-center' },
      callback: { onPreferenceExpressedOrNotNeeded: consent, onPreferenceExpressed: consent, onStartupFailed: () => consent(null), onFatalError: () => consent(null) }
    };
    const cmp = document.createElement('script');
    cmp.src = 'https://cdn.iubenda.com/cs/iubenda_cs.js'; cmp.async = true; cmp.charset = 'UTF-8';
    document.head.append(cmp);
  }).catch(() => { consent(null); });
})();
