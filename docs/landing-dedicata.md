# Landing dedicata: collaudo di produzione 1.0.31

La sezione `/offerta-dedicata/` viene resa dinamicamente dalla Function `landingPage` del progetto caspersales-ea7cc, regione europe-west1. Nginx verifica TLS e serve dal sito gli asset sotto `public/offerta-dedicata/`. Nessuna copia HTML viene creata per impresa: Firebase legge il profilo CRM tramite slug e sceglie il template base o IOL.

Lotto iniziale: `/offerta-dedicata/guerra/`, `battaglia/`, `zani/`, `pini/`, `buffoli/`. Senza slug riconosciuto viene mostrata la base. La funzione non restituisce recapiti privati, ID CRM o dati commerciali. Pagine `no-store`, `noindex, nofollow` per il collaudo.

Il comando **Avvia test eventi** abilita una sessione esplicita nel Diario reale del lead. `/offerta-dedicata/events` inoltra JSON limitato a 16 KiB al collector Firebase; il sito non accede a Firestore. I clic mantengono l'origine e non confermano chiamate, messaggi o prenotazioni. Gli script non impediscono i normali link telefono/WhatsApp. Il calendario resta dimostrativo e non invia dati del modulo.

GTM, iubenda e i pixel del sito esistente restano invariati. La nuova landing non introduce tag marketing e non registra visite automaticamente: l'avvio automatico/consenso e Google Calendar sono fasi successive.

Prerequisito del deploy: entrambe le Functions pubblicate dal commit verificato di casper-sales. I dettagli del protocollo, i limiti e i test sono in `casper-sales/docs/landing-produzione.md`.

Verifiche: audit produzione senza vulnerabilita, controllo segreti, build Astro, controllo markup di consenso; `nginx -t` durante la build Docker. Rilascio tramite pipeline esistente con versione 1.0.31; verificare poi `/version.json`, route, asset e Diario reale. Baseline rollback: 1.0.30 / 8c09bdc123899887debae3944b6e81ffc4707bcc.
