const dialog=document.getElementById('booking');
const selection=document.getElementById('booking-selection');
const form=document.getElementById('booking-form');
const completed=document.getElementById('booking-complete');
const slots=document.querySelector('.slots');
const next=document.querySelector('.booking-next');
const dayLabels=['Lunedì 19 ottobre 2026','Martedì 20 ottobre 2026','Mercoledì 21 ottobre 2026'];
const times=[['09:30','10:30','11:30','14:30','15:30','16:30'],['10:00','11:00','14:00','15:00'],['09:00','10:00','11:00','14:30','16:00']];
let selectedDay=0,selectedTime=null,opener=null;
function renderSlots(){selectedTime=null;next.disabled=true;slots.replaceChildren();for(const time of times[selectedDay]){const btn=document.createElement('button');btn.type='button';btn.textContent=time;btn.setAttribute('aria-pressed','false');btn.addEventListener('click',()=>{selectedTime=time;slots.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));next.disabled=false;});slots.append(btn);}}
function closeDialog(){dialog.close();if(opener)opener.focus();}
document.querySelectorAll('[data-book]').forEach(button=>button.addEventListener('click',()=>{opener=button;selection.hidden=false;form.hidden=true;completed.hidden=true;form.reset();selectedDay=0;document.querySelectorAll('[data-day]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.day==='0')));renderSlots();dialog.showModal();}));
document.querySelectorAll('[data-day]').forEach(button=>button.addEventListener('click',()=>{selectedDay=Number(button.dataset.day);document.querySelectorAll('[data-day]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderSlots();}));
next.addEventListener('click',()=>{if(!selectedTime)return;document.querySelectorAll('.chosen-slot').forEach(el=>el.textContent=`${dayLabels[selectedDay]} · ${selectedTime} · 30 minuti`);selection.hidden=true;form.hidden=false;form.querySelector('input').focus();});
document.querySelector('.back-step').addEventListener('click',()=>{form.hidden=true;selection.hidden=false;});
form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;form.hidden=true;completed.hidden=false;});
document.querySelector('.close-dialog').addEventListener('click',closeDialog);
document.querySelector('.close-preview').addEventListener('click',closeDialog);
dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))closeDialog();});
dialog.addEventListener('cancel',()=>{if(opener)opener.focus();});
document.querySelectorAll('[data-whatsapp]').forEach(a=>a.href='https://wa.me/393408384217?text='+encodeURIComponent('Ciao Giuliano, vorrei parlare del sito e dei servizi digitali per la mia impresa con AnnunciFunebri.it.'));
const answers={sito:'Partiamo dal tuo sito: vediamo come racconta la tua impresa e come renderlo più utile alle famiglie.',necrologi:'Guardiamo insieme necrologi, messaggi di cordoglio e libretto: un servizio che accompagna le famiglie.',spazi:'Partiamo dai tuoi spazi: vediamo le possibilità di monitor, raccolta dei cordogli e streaming riservato.'};
document.querySelectorAll('[data-interest]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-interest]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('[data-interest-answer]').textContent=answers[button.dataset.interest];}));
