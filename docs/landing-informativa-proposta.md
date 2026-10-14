# Testo della landing approvato da Cas-Per

Approvazione del testo e della raccolta ricevuta da Andrea il 14 ottobre 2026: "Ok per iubenda". Aggiornamento della policy e pubblicazione ancora da completare: il pannello iubenda richiede l'accesso all'account che gestisce cas-per.it. `tracking-consent.md` richiede l'approvazione Cas-Per dei testi legali e delle finalita dichiarate in iubenda. La policy pubblica attuale elenca Google Analytics 4 nella sezione Statistica; non basta questo a confermare che descriva la misurazione diretta associata all'impresa nel CRM.

## Testo aggiunto dopo il footer

> Se acconsenti alla misurazione, Cas-Per registra nel proprio CRM la visita, il tempo attivo, lo scorrimento e i clic, associandoli all'impresa indicata in questa pagina. Puoi cambiare scelta nelle preferenze privacy. Informativa privacy.

Le preferenze riaprono il pannello iubenda; l'informativa rimanda alla policy gia configurata. La raccolta usa il consenso Misurazione (4), non presume il consenso in assenza di una scelta. GTM e pixel non vengono caricati nella landing.

## Perimetro da riportare nella policy prima dell'attivazione pubblica

Misurazione delle landing personalizzate tramite Cas-Per Sales: slug dell'impresa, data/ora, ID casuale di sessione, tempo attivo, soglie di scorrimento e clic su telefono, WhatsApp e apertura agenda, con distinzione dell'offerta di integrazione o nuovo sito. L'attivita viene associata all'impresa indicata dal link per valutare l'interesse nella proposta; non identifica con certezza la persona che visita. Non vengono raccolti dal tracker indirizzo IP, user-agent, dati del modulo, contenuto dei messaggi o esiti di contatto/prenotazione. Gli eventuali log del fornitore di hosting sono distinti da questi documenti CRM.

Il tracker non salva un identificatore del visitatore sul dispositivo. Iubenda mantiene le preferenze come nel sito esistente. Il collector usa Firebase in europe-west1 e i documenti sono accessibili agli operatori autorizzati del CRM. La revoca interrompe nuovi invii, senza cancellare retroattivamente quelli gia ricevuti. Il limite tecnico di sessione e di 30 minuti; non e una scadenza di conservazione dei documenti. Le modalita e il periodo di conservazione devono essere descritti nella policy approvata da Cas-Per: questo intervento non introduce cancellazioni automatiche.

## Riferimento dell'integrazione tecnica

[iubenda: callbacks e consenso per finalita](https://www.iubenda.com/en/help/1205-how-to-configure-your-cookie-solution-advanced-guide-2/). Misurazione e la categoria 4; i callback `onPreferenceExpressedOrNotNeeded` e `onPreferenceExpressed` gestiscono caricamento e aggiornamento, senza concedere consenso quando la preferenza e assente.
