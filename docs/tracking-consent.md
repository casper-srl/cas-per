# Tracciamento e consenso

## Modello scelto

Il sito usa Google Consent Mode v2 in modalità avanzata:

- prima di GTM, tutti i consensi non essenziali partono da `denied`;
- GTM si carica subito e i tag Google compatibili possono inviare soltanto segnali cookieless finché il consenso resta negato;
- iubenda aggiorna i segnali e pubblica `iubenda_gtm_consent_event` quando le preferenze cambiano;
- GTM è l'unico controller di GA4, Meta Pixel, Clarity e Brevo;
- il sito non carica direttamente questi quattro strumenti e non include il fallback `noscript` di GTM.

Gli identificatori pubblici sono versionati in `src/data/marketingTracking.json`. I testi legali e le finalità dichiarate in iubenda devono essere approvati da Cas-Per.

## Blocco prima del deploy

Il contenitore pubblico `GTM-PB2XSQQQ`, verificato il 6 agosto 2026, non è ancora compatibile con questo modello:

- una configurazione concede `analytics_storage` prima della scelta;
- Clarity e Brevo non risultano protetti da controlli aggiuntivi;
- iubenda viene ancora caricato dal contenitore, mentre ora e incorporato direttamente nel sito.

Non pubblicare questa modifica finché un nuovo workspace GTM non è stato verificato e approvato.

## Modifiche richieste in GTM

1. Rimuovere la vecchia installazione iubenda e i tag che impostano direttamente i consensi.
2. Lasciare Google tag e GA4 sotto i controlli nativi di Consent Mode, con una sola `page_view`.
3. Meta Pixel: richiedere `ad_storage`, `ad_user_data` e `ad_personalization`; attivare dopo `iubenda_gtm_consent_event`.
4. Clarity: per la scelta conservativa approvata, richiedere `analytics_storage` e attivare dopo `iubenda_gtm_consent_event`.
5. Brevo: richiedere `functionality_storage` e attivare dopo `iubenda_gtm_consent_event`; il caricamento esplicito su interazione potra essere aggiunto in seguito.
6. Verificare in GTM Preview i casi rifiuta tutto, sola misurazione, solo marketing e accetta tutto.
7. Pubblicare il contenitore soltanto dopo aver verificato cookie, richieste di rete ed eventi con una sessione pulita.

## Verifica locale

Dopo la build, `npm run check:tracking` controlla che:

- i default negati precedano GTM;
- GTM e iubenda compaiano una sola volta;
- GA4, Meta, Clarity e Brevo non siano caricati direttamente;
- non sia presente il fallback `noscript` di GTM.

Il controllo riguarda il markup del sito. La configurazione interna del contenitore GTM deve essere verificata separatamente prima di ogni pubblicazione che la modifica.

## Riferimenti tecnici

- [Google: Consent Mode per i siti](https://developers.google.com/tag-platform/security/guides/consent)
- [Google: modalità Basic e Advanced](https://developers.google.com/tag-platform/security/concepts/consent-mode)
- [iubenda: configurazione avanzata](https://www.iubenda.com/en/help/1205-how-to-configure-your-cookie-solution-advanced-guide-2/)
- [iubenda: integrazione con Google Tag Manager](https://www.iubenda.com/en/help/74198-google-consent-mode-set-up-google-tag-manager-with-iubenda/)
