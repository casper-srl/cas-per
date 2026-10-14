const dialog = document.getElementById('booking');
const bookingUrl = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ2BaoyGLqfhHRVr0zvG_r-DCdSefS1F4KmhlFoa7GinJtrHr_VKvI-Y9QJo6VA5OczNS10n5p42';
// Supports cached HTML from the previous release while the shared templates are deployed.
dialog.querySelectorAll('.demo-note, #booking-selection, #booking-form, #booking-complete').forEach(node => node.remove());
const calendar = document.createElement('div');
calendar.className = 'google-booking';
calendar.innerHTML = `<p>Scegli uno degli orari disponibili. Google gestisce la prenotazione e ti invia l’invito con il link Meet. <a href="${bookingUrl}" target="_blank" rel="noopener noreferrer">Apri l’agenda in una nuova scheda ↗</a></p><iframe title="Prenota 30 minuti con Giuliano su Google Calendar" referrerpolicy="no-referrer"></iframe>`;
dialog.append(calendar);
const frame = calendar.querySelector('iframe');
let opener = null;
document.querySelectorAll('.preview-calendar-note').forEach(note => { note.textContent = 'Disponibilità reale · prenotazione con Google Calendar'; });
document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => {
  opener = button;
  frame.src = `${bookingUrl}?gv=true`;
  dialog.showModal();
}));
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const r = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  frame.removeAttribute('src');
  if (opener) opener.focus();
});
document.querySelectorAll('[data-whatsapp]').forEach(a=>a.href='https://wa.me/393408384217?text='+encodeURIComponent('Ciao Giuliano, vorrei parlare del sito e dei servizi digitali per la mia impresa con AnnunciFunebri.it.'));
const answers={sito:'Partiamo dal tuo sito: vediamo come racconta la tua impresa e come renderlo più utile alle famiglie.',necrologi:'Guardiamo insieme necrologi, messaggi di cordoglio e libretto: un servizio che accompagna le famiglie.',spazi:'Partiamo dai tuoi spazi: vediamo le possibilità di monitor, raccolta dei cordogli e streaming riservato.'};
document.querySelectorAll('[data-interest]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-interest]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('[data-interest-answer]').textContent=answers[button.dataset.interest];}));
