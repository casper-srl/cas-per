# Prenotazioni reali sulla landing

La proposta generica e tutte le imprese del pilot usano un solo programma Google Calendar di AnnunciFunebri. Il link pubblico e quello incorporato sono gestiti da Google; `public/offerta-dedicata/interaction.js` contiene l'URL della pagina specifica, senza credenziali.

Configurazione autorizzata il 14 ottobre 2026: appuntamenti di 30 minuti con Giuliano, lunedi-venerdi 10:00-13:00 e 15:00-18:00, fuso Europe/Rome. Gli eventi occupati del medesimo calendario escludono gli slot. Restano i default Google di anticipo minimo 4 ore e finestra 60 giorni. Google genera il link Meet, invia l'invito e un promemoria un giorno prima. Il modulo richiede nome, cognome, email e impresa.

L'iframe non ha `src` prima del clic e viene scaricato alla chiusura del dialogo; la successiva apertura rilegge le disponibilita. Il booking funziona indipendentemente dal consenso di misurazione. Il link esterno permette di continuare se l'iframe non e utilizzabile. Non vengono passati slug o dati CRM a Google; il referrer dell'iframe e disabilitato.

Il tracker conserva `booking_open` e l'origine della CTA, quando la misurazione e consentita. Il modulo Google resta cross-origin: caricamento, scelta di uno slot e chiusura del dialogo non sono una conversione confermata. Il collector continua a rifiutare `booking_confirmed` dal browser. La ricezione e associazione di conferme effettive nel Diario richiede un successivo collegamento server autorizzato al calendario.

Pubblicazione coordinata: distribuire prima gli asset del sito, compatibili anche con il precedente HTML dimostrativo; poi soltanto `landingPage` da Cas-Per Sales, con i due template comuni ripuliti. Nessun deploy Hosting/Firestore o modifica ai cinque lead e richiesto. Le bozze della galleria restano storiche.

Verificare CTA dei due box e della pagina generica, mobile, Google Meet/modulo, chiusura e riapertura, rifiuto della misurazione e distinzione degli eventi. Un appuntamento di prova con invito reale va autorizzato e identificato separatamente.
