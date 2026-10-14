const dialog = document.getElementById('booking');
const bookingUrl = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ2BaoyGLqfhHRVr0zvG_r-DCdSefS1F4KmhlFoa7GinJtrHr_VKvI-Y9QJo6VA5OczNS10n5p42';
// Supports cached HTML from the previous release while the shared templates are deployed.
dialog.querySelectorAll('.demo-note, #booking-selection, #booking-form, #booking-complete').forEach(node => node.remove());
const calendar = document.createElement('div');
calendar.className = 'google-booking';
calendar.innerHTML = `<form id="booking-email-form"><label for="booking-email">A quale email riceverai l’invito?</label><input id="booking-email" type="email" autocomplete="email" maxlength="254" required placeholder="La tua email"><p>Usa la stessa email anche nel modulo Google: ci permetterà di verificare la prenotazione e confermartela qui. <a href="/offerta-dedicata/privacy/" target="_blank" rel="noopener noreferrer">Informativa privacy</a></p><button type="submit" class="btn">Scegli un orario <span aria-hidden="true">↗</span></button></form><p id="booking-status" role="status" aria-live="polite"></p><div id="booking-agenda" hidden><p id="booking-origin"></p><p>Scegli uno degli orari disponibili e completa il modulo Google. Riceverai l’invito con il link Meet. <a href="${bookingUrl}" target="_blank" rel="noopener noreferrer">Apri l’agenda in una nuova scheda ↗</a></p><iframe title="Prenota 30 minuti con Giuliano su Google Calendar" referrerpolicy="no-referrer"></iframe></div><section id="booking-success" hidden><p class="eyebrow">CI VEDIAMO PRESTO</p><h2>Prenotazione confermata.</h2><p id="booking-time"></p><p>Grazie per il tuo tempo. Troverai l’invito e il link Meet nella tua email.<br>A presto, Giuliano.</p><button type="button" class="btn" id="booking-return">Torna alla proposta</button></section>`;
dialog.append(calendar);
const frame = calendar.querySelector('iframe');
const emailForm = calendar.querySelector('#booking-email-form'), emailInput = calendar.querySelector('#booking-email');
const agenda = calendar.querySelector('#booking-agenda'), success = calendar.querySelector('#booking-success'), status = calendar.querySelector('#booking-status');
const sources = { iol_integration: '01 · Integrare il sito IOL', new_website: '02 · Nuovo sito', generic: 'Proposta generale' };
let opener = null, attempt = null, timer = null, starting = false;
const postBooking = async payload => {
  const response = await fetch('/offerta-dedicata/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error('Verifica non disponibile');
  return response.json();
};
const agendaOpened = () => document.dispatchEvent(new CustomEvent('landing:booking-open', { detail: { source: attempt.source } }));
const pollBooking = async () => {
  clearTimeout(timer);
  if (!dialog.open || !attempt?.started || attempt.confirmed) return;
  const current = attempt;
  try {
    const result = await postBooking({ action: 'status', request_id: current.request_id, token: current.token });
    if (attempt !== current) return;
    if (result.status === 'confirmed') {
      current.confirmed = result; if (dialog.open) showConfirmed(); return;
    }
    if (result.status === 'expired') {
      status.textContent = 'La verifica automatica è scaduta. Se hai prenotato, l’invito Google resta la conferma del tuo appuntamento. Per assistenza contatta Giuliano.';
      return;
    }
    status.textContent = (document.body.dataset.companyShortName ? `Nel modulo Google usa la stessa email e indica l’impresa ${document.body.dataset.companyShortName}. ` : 'Nel modulo Google usa la stessa email. ') + 'Dopo la prenotazione, attendi qui qualche istante: verificheremo la conferma su Google.';
  } catch {
    status.textContent = 'La verifica sta impiegando più tempo. Se hai già prenotato, non ripetere la prenotazione: controlla l’invito Google nella tua email.';
  }
  if (dialog.open && attempt === current) timer = setTimeout(pollBooking, 5000);
};
const showConfirmed = () => {
  frame.removeAttribute('src'); agenda.hidden = true; emailForm.hidden = true; success.hidden = false;
  status.textContent = '';
  calendar.querySelector('#booking-time').textContent = new Intl.DateTimeFormat('it-IT', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Rome' }).format(new Date(attempt.confirmed.starts_at)) + ' · 30 minuti · ora italiana';
  calendar.querySelector('#booking-return').focus();
};
const showAgenda = () => {
  emailForm.hidden = true; agenda.hidden = false; success.hidden = true;
  calendar.querySelector('#booking-origin').textContent = 'Il tuo incontro: ' + sources[attempt.source];
  status.textContent = document.body.dataset.companyShortName ? `Nel modulo Google usa la stessa email e indica l’impresa ${document.body.dataset.companyShortName}.` : 'Nel modulo Google usa la stessa email e indica la tua impresa.';
  frame.src = `${bookingUrl}?gv=true`; agendaOpened(); pollBooking();
};
emailForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (starting) return;
  const email = emailInput.value.trim().toLowerCase();
  if (!emailForm.reportValidity()) return;
  const source = { integrazione: 'iol_integration', 'nuovo-sito': 'new_website' }[opener?.dataset.focus] || 'generic';
  if (!attempt || attempt.email !== email || attempt.source !== source) {
    const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
    attempt = { request_id: `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`, token: [...crypto.getRandomValues(new Uint8Array(32))].map(value => value.toString(16).padStart(2, '0')).join(''), email, source };
  }
  const current = attempt;
  starting = true; emailForm.querySelector('button').disabled = true; status.textContent = 'Apro l’agenda…';
  try {
    await postBooking({ action: 'start', request_id: current.request_id, token: current.token, email, source, slug: document.body.dataset.landingSlug || document.querySelector('script[data-slug]')?.dataset.slug || '' });
    current.started = true;
    if (dialog.open) showAgenda();
  } catch { status.textContent = 'Non riesco ad aprire la verifica. Riprova oppure contatta Giuliano tramite telefono o WhatsApp.'; }
  finally { starting = false; emailForm.querySelector('button').disabled = false; }
});
calendar.querySelector('#booking-return').addEventListener('click', () => dialog.close());
calendar.querySelector('#booking-agenda a').addEventListener('click', agendaOpened);
document.querySelectorAll('.preview-calendar-note').forEach(note => { note.textContent = 'Disponibilità reale · prenotazione con Google Calendar'; });
document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => {
  opener = button;
  dialog.showModal();
  if (attempt?.confirmed) showConfirmed();
  else if (attempt?.started) showAgenda();
  else { emailInput.focus(); }
}));
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const r = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  clearTimeout(timer);
  frame.removeAttribute('src');
  if (opener) opener.focus();
});
document.querySelectorAll('[data-whatsapp]').forEach(a=>a.href='https://wa.me/393408384217?text='+encodeURIComponent('Ciao Giuliano, vorrei parlare del sito e dei servizi digitali per la mia impresa con AnnunciFunebri.it.'));
const answers={sito:'Partiamo dal tuo sito: vediamo come racconta la tua impresa e come renderlo più utile alle famiglie.',necrologi:'Guardiamo insieme necrologi, messaggi di cordoglio e libretto: un servizio che accompagna le famiglie.',spazi:'Partiamo dai tuoi spazi: vediamo le possibilità di monitor, raccolta dei cordogli e streaming riservato.'};
document.querySelectorAll('[data-interest]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-interest]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('[data-interest-answer]').textContent=answers[button.dataset.interest];}));
