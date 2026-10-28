const dialog = document.getElementById('booking');
const bookingUrl = 'https://calendly.com/annuncifunebri-info/30min?hide_event_type_details=1';
const sources = { iol_integration: '01 · Integrare il sito IOL', new_website: '02 · Nuovo sito', generic: 'Proposta generale' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const eventUri = value => typeof value === 'string' && /^https:\/\/api\.calendly\.com\/scheduled_events\/[a-zA-Z0-9_-]{8,80}$/.test(value);
const inviteeUri = (value, event) => typeof value === 'string' && eventUri(event) && value.startsWith(`${event}/invitees/`) && /^[a-zA-Z0-9_-]{8,80}$/.test(value.slice(`${event}/invitees/`.length));
dialog.classList.add('calendly-booking-dialog');
// Also accepts cached landing templates from before the Calendly release.
dialog.querySelectorAll('.demo-note, #booking-selection, #booking-form, #booking-complete').forEach(node => node.remove());
const panel = document.createElement('section');
panel.className = 'calendly-booking';
panel.innerHTML = `<p id="booking-origin"></p><p id="booking-status" role="status" aria-live="polite"></p><div id="calendly-slot-picker"></div><p class="booking-privacy">Scegli l’orario, poi inserisci nome ed email. Calendly invierà l’invito con Google Meet. <a href="/offerta-dedicata/privacy/" target="_blank" rel="noopener noreferrer">Informativa privacy</a></p><section id="booking-success" hidden><p class="eyebrow">CI VEDIAMO PRESTO</p><h2>Prenotazione confermata.</h2><p id="booking-time"></p><p>Grazie per il tuo tempo. Troverai l’invito e il link Meet nella tua email.<br>A presto, Giuliano.</p><button type="button" class="btn" id="booking-return">Torna alla proposta</button></section>`;
dialog.append(panel);
const widget = panel.querySelector('#calendly-slot-picker'), status = panel.querySelector('#booking-status'), success = panel.querySelector('#booking-success');
let opener = null, attempt = null, mountedAttempt = null, timer = null, loading = null, starting = false, checking = false;
const storageKey = 'casper-calendly:' + window.location.pathname;
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey));
  if (UUID.test(saved?.request_id || '') && /^[a-f0-9]{64}$/.test(saved?.token || '') && /^[a-f0-9]{64}$/.test(saved?.tracking_code || '') && Object.hasOwn(sources, saved?.source) && Date.parse(saved.expires_at) > Date.now()) attempt = saved;
  else sessionStorage.removeItem(storageKey);
} catch { /* Booking still works when session storage is unavailable. */ }
const remember = () => {
  try { sessionStorage.setItem(storageKey, JSON.stringify({ request_id: attempt.request_id, token: attempt.token, source: attempt.source, tracking_code: attempt.tracking_code, expires_at: attempt.expires_at,
    ...(attempt.event_uri ? { event_uri: attempt.event_uri, invitee_uri: attempt.invitee_uri } : {}) })); }
  catch { /* Keep the tab open to retain the current verification. */ }
};
const uuid = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
const postBooking = async payload => {
  const response = await fetch('/offerta-dedicata/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error('Verifica non disponibile');
  return response.json();
};
const loadWidget = () => {
  if (window.Calendly) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.onload = resolve; script.onerror = () => { script.remove(); loading = null; reject(new Error('Calendly non disponibile')); };
    document.head.append(script);
  });
  return loading;
};
const showConfirmed = () => {
  widget.hidden = true; panel.querySelector('.booking-privacy').hidden = true; success.hidden = false; status.textContent = '';
  panel.querySelector('#booking-time').textContent = new Intl.DateTimeFormat('it-IT', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Rome' }).format(new Date(attempt.confirmed.starts_at)) + ' · 30 minuti · ora italiana';
  dialog.scrollTop = 0; panel.querySelector('#booking-return').focus();
};
const pollBooking = async () => {
  clearTimeout(timer);
  if (!dialog.open || !attempt?.tracking_code || attempt.confirmed || checking) return;
  const current = attempt; checking = true;
  try {
    const result = await postBooking({ action: current.event_uri ? 'calendly_complete' : 'calendly_status', request_id: current.request_id, token: current.token,
      ...(current.event_uri ? { event_uri: current.event_uri, invitee_uri: current.invitee_uri } : {}) });
    if (attempt !== current) return;
    if (result.status === 'confirmed') { current.confirmed = result; if (dialog.open) showConfirmed(); return; }
    if (result.status === 'expired') {
      status.textContent = 'La verifica automatica è scaduta. Se hai prenotato, l’invito Calendly resta la conferma del tuo appuntamento. Per assistenza contatta Giuliano.';
      return;
    }
    if (current.event_uri) status.textContent = 'Verifico la tua prenotazione…';
  } catch {
    if (attempt === current) status.textContent = 'La verifica sta impiegando più tempo. Se hai prenotato, non ripetere la prenotazione: controlla l’invito nella tua email.';
  } finally { checking = false; }
  if (dialog.open && attempt === current) timer = setTimeout(pollBooking, 5000);
};
const showAgenda = async () => {
  panel.querySelector('#booking-origin').textContent = 'Il tuo incontro: ' + sources[attempt.source];
  if (attempt.confirmed) { showConfirmed(); return; }
  if (mountedAttempt === attempt) { pollBooking(); return; }
  const current = attempt;
  status.textContent = 'Carico gli orari disponibili…';
  await loadWidget();
  if (!dialog.open || attempt !== current) return;
  widget.replaceChildren(); widget.hidden = false; success.hidden = true; panel.querySelector('.booking-privacy').hidden = false;
  mountedAttempt = current;
  window.Calendly.initInlineWidget({ url: bookingUrl, parentElement: widget, resize: false,
    utm: { utmSource: 'casper-sales', utmCampaign: 'landing-dedicata', utmContent: current.tracking_code, utmTerm: current.source } });
  pollBooking();
};
window.addEventListener('message', event => {
  const frame = widget.querySelector('iframe');
  if (!frame || !attempt || !mountedAttempt || event.origin !== 'https://calendly.com' || event.source !== frame.contentWindow || mountedAttempt !== attempt) return;
  if (event.data?.event === 'calendly.page_height' && /^\d+(?:px)?$/.test(String(event.data.payload?.height))) {
    const height = Number.parseInt(event.data.payload.height, 10);
    if (height >= 300 && height <= 5000) widget.style.height = `${height}px`;
  }
  if (event.data?.event === 'calendly.event_type_viewed') {
    if (!attempt.event_uri) status.textContent = '';
    if (!attempt.agendaOpened) {
      attempt.agendaOpened = true;
      document.dispatchEvent(new CustomEvent('landing:booking-open', { detail: { source: attempt.source } }));
    }
  }
  if (event.data?.event === 'calendly.event_scheduled') {
    const eventUrl = event.data.payload?.event?.uri, inviteeUrl = event.data.payload?.invitee?.uri;
    if (!inviteeUri(inviteeUrl, eventUrl)) return;
    attempt.event_uri = eventUrl; attempt.invitee_uri = inviteeUrl; remember(); status.textContent = 'Verifico la tua prenotazione…'; pollBooking();
  }
});
document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', async () => {
  opener = button; dialog.showModal(); dialog.querySelector('.close-dialog').focus();
  if (starting) return;
  starting = true;
  const source = { integrazione: 'iol_integration', 'nuovo-sito': 'new_website' }[button.dataset.focus] || 'generic';
  try {
    if (!attempt || (!attempt.event_uri && !attempt.confirmed && (attempt.source !== source || Date.parse(attempt.expires_at) <= Date.now()))) {
      attempt = { request_id: uuid(), token: [...crypto.getRandomValues(new Uint8Array(32))].map(value => value.toString(16).padStart(2, '0')).join(''), source };
    }
    if (!attempt.tracking_code) {
      const current = attempt;
      status.textContent = 'Apro l’agenda…';
      const result = await postBooking({ action: 'calendly_start', request_id: current.request_id, token: current.token, source, slug: document.body.dataset.landingSlug || document.querySelector('script[data-slug]')?.dataset.slug || '' });
      current.tracking_code = result.tracking_code; current.expires_at = result.expires_at; remember();
    }
    await showAgenda();
  } catch { status.textContent = 'Non riesco ad aprire l’agenda. Chiudi e riapri per riprovare, oppure contatta Giuliano tramite telefono o WhatsApp.'; }
  finally { starting = false; }
}));
panel.querySelector('#booking-return').addEventListener('click', () => dialog.close());
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const r = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
});
dialog.addEventListener('close', () => { clearTimeout(timer); if (opener) opener.focus(); });
window.addEventListener('focus', () => { if (dialog.open) pollBooking(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && dialog.open) pollBooking(); });
document.querySelectorAll('.preview-calendar-note').forEach(note => { note.textContent = 'Disponibilità reale · prenotazione con Calendly'; });
if (attempt) { dialog.showModal(); showAgenda().catch(() => { status.textContent = 'L’agenda non è disponibile. Riprova oppure contatta Giuliano.'; }); }
else if (window.location.hash === '#prenota') document.querySelector('[data-book]')?.click();

document.querySelectorAll('[data-whatsapp]').forEach(a=>a.href='https://wa.me/393408384217?text='+encodeURIComponent('Ciao Giuliano, vorrei parlare del sito e dei servizi digitali per la mia impresa con AnnunciFunebri.it.'));
const answers={sito:'Partiamo dal tuo sito: vediamo come racconta la tua impresa e come renderlo più utile alle famiglie.',necrologi:'Guardiamo insieme necrologi, messaggi di cordoglio e libretto: un servizio che accompagna le famiglie.',spazi:'Partiamo dai tuoi spazi: vediamo le possibilità di monitor, raccolta dei cordogli e streaming riservato.'};
document.querySelectorAll('[data-interest]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-interest]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('[data-interest-answer]').textContent=answers[button.dataset.interest];}));
